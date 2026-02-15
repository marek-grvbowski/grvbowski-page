const referencesButton = document.getElementById('referencesButton');
const calendarButton = document.getElementById('calendarButton');
const contactButton = document.getElementById('contactButton');
const carouselContainer = document.getElementById('carouselContainer');
const calendarContainer = document.getElementById('calendarContainer');
const contactContainer = document.getElementById('contactContainer');
const carouselWrapper = document.getElementById('carouselWrapper');
const nextButton = document.getElementById('nextButton');
let currentIndex = 0;

// Zamknij wszystkie sekcje
function closeAllContainers() {
    [carouselContainer, calendarContainer, contactContainer].forEach(container => {
        if (!container) {
            return;
        }
        container.classList.remove('show');
        container.style.maxHeight = '0';
        container.style.opacity = '0';
        container.style.padding = '0';
    });
}

// Funkcja do przełączania sekcji
function toggleContainer(container) {
    if (!container) {
        return;
    }

    if (!container.classList.contains('show')) {
        closeAllContainers();
        container.classList.add('show');
        container.style.maxHeight = '300px';
        container.style.opacity = '1';
        container.style.padding = '20px';
    } else {
        container.classList.remove('show');
        container.style.maxHeight = '0';
        container.style.opacity = '0';
        container.style.padding = '0';
    }
}

function handleToggleEvent(event, container) {
    if (event.type === 'click') {
        if (event.detail === 0) {
            event.preventDefault();
            return;
        }

        event.preventDefault();
        toggleContainer(container);
        return;
    }

    if (event.type === 'keydown') {
        const key = event.key;
        if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
            event.preventDefault();
            toggleContainer(container);
        }
    }
}

function registerToggleControl(control, container) {
    if (!control) {
        return;
    }

    control.addEventListener('click', event => handleToggleEvent(event, container));
    control.addEventListener('keydown', event => handleToggleEvent(event, container));
}

// Eventy do przycisków sekcji
registerToggleControl(referencesButton, carouselContainer);
registerToggleControl(calendarButton, calendarContainer);
registerToggleControl(contactButton, contactContainer);

// Przewijanie karuzeli z referencjami
function updateCarousel() {
    if (!carouselWrapper) {
        return;
    }
    const offset = -currentIndex * 100;
    carouselWrapper.style.transform = `translateX(${offset}%)`;
}

if (nextButton) {
    nextButton.addEventListener('click', event => {
        event.preventDefault();
        if (!carouselWrapper) {
            return;
        }
        currentIndex = (currentIndex < carouselWrapper.children.length - 1) ? currentIndex + 1 : 0;
        updateCarousel();
    });

    nextButton.addEventListener('keydown', event => {
        const key = event.key;
        if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
            event.preventDefault();
            if (!carouselWrapper) {
                return;
            }
            currentIndex = (currentIndex < carouselWrapper.children.length - 1) ? currentIndex + 1 : 0;
            updateCarousel();
        }
    });
}
