document.querySelectorAll('#services span.bi').forEach((icon) => {
    icon.addEventListener('click', (event) => {
        console.log('clicked', icon);
        // Toggle the active class on the clicked icon
        icon.classList.toggle('active');

        // Get the corresponding menu
        const menu = icon.nextElementSibling.nextElementSibling; // Skip the label and get the next element
        if (menu && menu.classList.contains('menu')) {
            // Toggle the active class on the menu
            menu.classList.toggle('visible');
            menu.classList.toggle('hidden');
        }
    });
});

// Close the menu when clicking outside
document.addEventListener('click', (event) => {
    if (!event.target.closest('.service-item')) {
        document.querySelectorAll('#services span.bi').forEach((icon) => {
            icon.classList.remove('active');
        });
        document.querySelectorAll('.menu').forEach((menu) => {
            menu.classList.remove('visible');
            menu.classList.add('hidden');
        });
    }
});

// Handle the start/stop/restart buttons
document.querySelectorAll('.menu button').forEach((button) => {
    button.addEventListener('click', (event) => {
        const service = button.id.split('-')[0];
        const action = button.id.split('-')[1];
        console.log('clicked', service, action);
        fetch(`/api/v1/admin/${action}service?service=${service}`, {
            method: 'GET',
        })
            .then((response) => response.json())
            .then((data) => {
                // Update the status icon
                setTimeout(getServiceStatus(service), 1000); // Wait for the service to start/stop/restart
            });
    });
});

function getServiceStatus(service) {
    fetch(`/api/v1/admin/statusservice?service=${service}`, {
        method: 'GET',
    })
        .then((response) => response.json())
        .then((data) => {
            // Update the status icon
            console.log('Updating status icon for', service);
            const statusIcon = document.getElementById(`${service}-status`);
            if (data.status && data.status.includes('running')) {
                statusIcon.classList.remove('offline');
                statusIcon.classList.add('online');
            } else {
                statusIcon.classList.remove('online');
                statusIcon.classList.add('offline');
            }
        });
}

// Initialize the status icons
document.querySelectorAll('.service-item').forEach((service) => {
    getServiceStatus(service.id);
});