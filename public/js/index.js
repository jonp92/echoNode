/** This script is used to load content from the server and inject it into the DOM
when a navigation item is clicked. Additionally it manages the rest of the echoNODE client UI.
*/

let dynamicScripts = [];

function navigate(navID) {
    fetchContent(navID).then((data) => {
        const pane = document.getElementsByClassName('pane')[0];
        pane.innerHTML = '';
        const innerPane = document.createElement('div');
        innerPane.innerHTML = data;
        pane.appendChild(innerPane);

        // Remove previously added dynamic scripts
        dynamicScripts.forEach(script => {
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        });
        dynamicScripts = [];

        // Evaluate and execute any inline scripts
        const scripts = innerPane.getElementsByTagName('script');
        const scriptPromises = [];
        for (let script of scripts) {
            const newScript = document.createElement('script');
            if (script.src) {
                console.log('Loading external script:', script.src);
                newScript.src = script.src; // External script
                scriptPromises.push(new Promise((resolve, reject) => {
                    newScript.onload = resolve;
                    newScript.onerror = reject;
                }));
            } else {
                console.log('Loading inline script');
                newScript.textContent = script.innerHTML; // Inline script
            }
            document.body.appendChild(newScript).parentNode.removeChild(newScript);
            dynamicScripts.push(newScript);
            console.log('Currently loaded scripts:', dynamicScripts);
        }

        // Wait for all external scripts to load before calling the init function
        Promise.all(scriptPromises).then(() => {
            if (typeof init === 'function') {
                init();
            }
        }).catch((err) => {
            console.error('Error loading scripts:', err);
        });
    }).catch((err) => {
        console.error(err);
    });
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

let navItems = document.querySelectorAll('.nav-group-item');
const debouncedNavigate = debounce((event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.hasAttribute('content-id')) {
        const foundContentID = target.getAttribute('content-id');
        console.log('Found content ID:', foundContentID);
        navigate(foundContentID);
    } else {
        const navID = target.id;
        navigate(navID);
    }
}, 300); // Adjust the debounce delay as needed

for (let item of navItems) {
    item.addEventListener('click', debouncedNavigate);
}

async function fetchContent(contentID) {
    try {
        const url = `/api/v1/content/get?page=${contentID}`
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        const data = await response.json();
        if (data && data.success === true) {
            return data.content
        } else {
            throw new Error('API response was not successful');
        }
    } catch (error) {
        console.error('There has been a problem with your fetch operation:', error.message); // Handle errors here
    }
}

const eventSource = new EventSource('/api/v1/events');
eventSource.onmessage = (event) => {
    console.log('Received event:', event.data);
};

eventSource.addEventListener('playbackResumed', (event) => {
    console.log('Playback resumed:', event.data);
});

eventSource.addEventListener('playbackPaused', (event) => {
    console.log('Playback paused:', event.data);
});

eventSource.addEventListener('playbackStopped', (event) => {
    console.log('Playback stopped:', event.data);
});

eventSource.addEventListener('playbackStarted', (event) => {
    console.log('Playback started:', event.data);
});

eventSource.addEventListener('playbackTime', (event) => {
    console.log('Playback time:', event.data);
});

eventSource.onerror = (event) => {
    console.error('EventSource failed:', event);
};