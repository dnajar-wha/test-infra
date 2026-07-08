const days = ["Sunday", "Monday","Tuesday","Wenesday", "Thursday", "Friday", "Saturday"]

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
    const el = document.getElementById('date_time');
    const date = new Date();
    const year = date.getFullYear()
    const month = date.getMonth();
    const dayOfTheWeek = date.getDate()
    const day = date.getDay()

    const hours = date.getHours()
    const minutes = date.getMinutes()

    console.log(date.toLocaleString('en-US', options))
    el.innerText = date.toLocaleString('en-US', options)
}


document.addEventListener("DOMContentLoaded", () => {
    console.log("The DOM is fully loaded!");
    getTodaysDate()

    const intervalId = setInterval(() => {
        console.log(`This runs every ${seconds} seconds.`);
        console.log(getTodaysDate()) 
    }, seconds * 1000);
});