$(document).ready(function() {
// arrow button
    const $scrollTopButton = $('.scroll-top-button');

    function toggleScrollTopButton() {
        if (!$scrollTopButton.length) {
            return;
        }

        $scrollTopButton.toggleClass('visible', $(window).scrollTop() > 300);
    }

    $('.hamburger').on('click', function() {
        $('nav').toggleClass('open');
    });

    $('nav a').on('click', function() {
        $('nav').removeClass('open');
    });

    // scroll smoothly to the top of the page when button is clicked
    $scrollTopButton.on('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    $(window).on('scroll', toggleScrollTopButton);
    toggleScrollTopButton();

       // slider on screens wider than 768px 
    if ($(window).width() > 768) {

        const $slides = $('#slides');

        // clone the first slide and add it to the end of the container
        // loop back to the start 
        $slides.children().first().clone().appendTo($slides);

        const total = $slides.children().length;

        let current = 0;

        function moveSlide() {
            current++;

            $slides.css({
                transition: 'transform 1s ease-in-out', 
                transform: 'translateX(-' + (current * 100) + 'vw)' 
            });

            // snap back to the real first slide
            if (current === total - 1) {
                setTimeout(function() {
                    $slides.css({
                        transition: 'none',
                        transform: 'translateX(0)' 
                    });
                    current = 0;
                }, 1000); 
            }
        }

        // move slide every 5 seconds
        setInterval(moveSlide, 5000);
    }

});