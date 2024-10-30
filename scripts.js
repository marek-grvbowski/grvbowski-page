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
        container.classList.remove('show');
        container.style.maxHeight = '0';
        container.style.opacity = '0';
        container.style.padding = '0';
    });
}

// Funkcja do przełączania sekcji
function toggleContainer(container) {
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

// Eventy do przycisków sekcji
referencesButton.addEventListener('click', () => toggleContainer(carouselContainer));
calendarButton.addEventListener('click', () => toggleContainer(calendarContainer));
contactButton.addEventListener('click', () => toggleContainer(contactContainer));

// Przewijanie karuzeli z referencjami
function updateCarousel() {
    const offset = -currentIndex * 100;
    carouselWrapper.style.transform = `translateX(${offset}%)`;
}

nextButton.addEventListener('click', () => {
    currentIndex = (currentIndex < carouselWrapper.children.length - 1) ? currentIndex + 1 : 0;
    updateCarousel();
});
