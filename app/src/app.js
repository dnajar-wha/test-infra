const days = ["Sunday", "Monday","Tuesday","Wednesday", "Thursday", "Friday", "Saturday"]

const options = { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'short', 
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
};

const seconds = 60; 

const getTodaysDate = () => {
    const date = new Date();
    const year = date.getFullYear()
    const month = date.getMonth();
    const dayOfTheWeek = date.getDate()
    const day = date.getDay()

    const hours = date.getHours()
    const minutes = date.getMinutes()

    return date.toLocaleString('en-US', options);
}


const template = `
<div>
    {{#if showUsers}}
        <h2>{{title}}</h2>
        <ul>
            {{#each users}}
                <li>
                    {{#if active}}
                        <user-card name="{{name}}" email="{{email}}" />
                    {{else}}
                        ❌ {{name}} (inactive)
                    {{/if}}
                </li>
            {{/each}}
        </ul>
    {{else}}
        <p>Users hidden</p>
    {{/if}}
    <small>Date: {{date}}</small>
</div>
`;

const data = {
    showUsers: true,
    title: "Team Members",
    users: [
        { name: "Alice", email: "alice@example.com", active: true },
        { name: "Bob", email: "bob@example.com", active: false },
        { name: "Charlie", email: "charlie@example.com", active: true }
    ],
    date: getTodaysDate()
};

component('user-card', {
    template: `
        <div class="card">
            <strong>✅{{name}}</strong>
            <span>{{email}}</span>
        </div>
    `,
    props: ['name', 'email']
});

const result = compile(template, data);
document.getElementById('app').innerHTML = result;