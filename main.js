document.addEventListener('DOMContentLoaded', async () => {
    window.scrollTo(0, 0);

    const mainContent = document.getElementById('main-content');

    const hamburgerIcon = document.getElementById('hamburger-icon');
    const mobileNavWrapper = document.getElementById('mobile-nav-wrapper');

    if (hamburgerIcon && mobileNavWrapper) {
        hamburgerIcon.addEventListener('click', () => {
            mobileNavWrapper.classList.toggle('active');
        });
    }

    const API_KEY = "AIzaSyDCEF0uk3x7YMLZuaNHOklU01iTYjYVS6Q"; 
    const MODEL_NAME = 'gemini-2.5-flash-preview-05-20';

    const impactSection = document.querySelector('.environmental-impact');
    const impactNumbers = document.querySelectorAll('.impact-card h3');

    const animateNumber = (element, target, suffix, duration = 2000) => {
        let start = 0;
        const increment = target / (duration / 10);
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current < target) {
                element.innerText = `${current.toFixed(target % 1 === 0 ? 0 : 1)}${suffix}`;
            } else {
                element.innerText = `${target}${suffix}`;
                clearInterval(timer);
            }
        }, 10);
    };

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.5
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                impactNumbers.forEach(numberElement => {
                    const target = parseFloat(numberElement.dataset.target);
                    const suffix = numberElement.dataset.suffix || '';
                    animateNumber(numberElement, target, suffix);
                });
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    if (impactSection) {
        observer.observe(impactSection);
    }

    const faqQuestions = document.querySelectorAll('.faq-question');

    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const faqItem = question.closest('.faq-item');
            
            faqQuestions.forEach(otherQuestion => {
                const otherFaqItem = otherQuestion.closest('.faq-item');
                if (otherFaqItem !== faqItem && otherFaqItem.classList.contains('active')) {
                    otherFaqItem.classList.remove('active');
                }
            });

            faqItem.classList.toggle('active');
        });
    });

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });

            if (mobileNavWrapper.classList.contains('active')) {
                mobileNavWrapper.classList.remove('active');
            }
        });
    });

    const backToTopButton = document.getElementById('back-to-top');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopButton.classList.add('show');
        } else {
            backToTopButton.classList.remove('show');
        }
    });

    backToTopButton.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    const animationObserverOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const animationObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, animationObserverOptions);

    document.querySelectorAll('.animate-on-scroll').forEach(element => {
        animationObserver.observe(element);
    });
});