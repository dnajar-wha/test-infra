/**
 * MINI-FRAMEWORK - Step 1: Template Compiler
 *
 * This does ONE thing: replaces {{ variable }} with actual values
 */
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function compile(template, data) {
    
    // STEP 1: {{#each}}...{{/each}}
    template = template.replace(
        /{{#each\s+([^}]+)\s*}}([\s\S]*?){{\/each}}/g,
        (match, arrayName, content) => {
            const array = splitDotNotation(arrayName, data);
            if (!Array.isArray(array)) return '';

            return array.map(item => {
                return compile(content, { ...data, ...item });
            }).join('');
        }
    );

    // STEP 2: {{#if}}...{{else}}...{{/if}}
    template = template.replace(
        /{{#if\s+([^}]+)\s*}}([\s\S]*?){{else}}([\s\S]*?){{\/if}}/g,
        (match, varName, content, elseContent) => {
            const value = splitDotNotation(varName, data);
            return value ? content : elseContent;
        }
    );

    // STEP 3: {{#if}}...{{/if}} (no else)
    template = template.replace(
        /{{#if\s+([^}]+)\s*}}([\s\S]*?){{\/if}}/g,
        (match, varName, content) => {
            const value = splitDotNotation(varName, data);
            return value ? content : '';
        }
    );

    // STEP 4: Components
    template = template.replace(/<([a-z][a-z0-9-]*)\s*(.*?)\s*\/?>/gi,
        (match, tagName, attrs) => {
            if (!components[tagName]) {
                return match; // Not a registered component, keep as-is
            }

            const component = components[tagName];
            const props = parseAttributes(attrs, data);
            return compile(component.template, { ...data, ...props });
        }
    );

    // STEP 4: Helpers (NEW!)
    template = template.replace(/{{\s*([^|]+)\s*\|\s*(\w+)\s*}}/g, (match, varName, helperName) => {
        const value = splitDotNotation(varName.trim(), data);
        const helper = helpers[helperName];

        if (helper) {
            return helper(value);
        }
        return value;
    });

    // STEP 5: Variable replacement
    return template.replace(/{{\s*([^}]+)\s*}}/g, (match, key) => {
        const trimmed = key.trim();

        if (trimmed.startsWith('&')) {
            const varName = trimmed.slice(1).trim();
            return splitDotNotation(varName, data);
        }

        const value = splitDotNotation(trimmed, data);
        return escapeHtml(value);
    });
}

function splitDotNotation(key, data) {  // Now accepts data as parameter
    const parts = key.split('.');
    let value = data;
    for (let i = 0; i < parts.length; i++) {
        if (value === undefined || value === null) return '';
        value = value[parts[i]];
    }
    return value !== undefined ? value : '';
}

// 1. Helper registry
const helpers = {
    uppercase: (val) => val.toUpperCase(),
    lowercase: (val) => val.toLowerCase(),
    currency: (val) => `$${Number(val).toFixed(2)}`,
    // users can add more
};

// 2. Register function
function registerHelper(name, fn) {
    helpers[name] = fn;
}

const components = {};

function component(name, options) {
    components[name] = options;
}

function parseAttributes(attrString, data) {
    const attrRegex = /(\w+)="([^"]*)"/g;
    const attributes = {};
    let match;
    while ((match = attrRegex.exec(attrString)) !== null) {
        const [, key, value] = match;

        // Check if value is a binding {{...}}
        const bindingMatch = value.match(/^\{\{\s*(.+?)\s*\}\}$/);
        if (bindingMatch) {
            // It's a binding, look up the value
            attributes[key] = splitDotNotation(bindingMatch[1], data);
        } else {
            // It's a literal string
            attributes[key] = value;
        }
    }
    return attributes;
}