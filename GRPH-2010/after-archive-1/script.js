//hamburger: https://stackoverflow.com/questions/65081375/responsive-hamburger-menu-via-jquery

// run code only after the full HTML document has loaded
$(document).ready(function() {

    // toggle the mobile nav open/closed when the hamburger button is clicked
    $('.hamburger').on('click', function() {
        $('nav').toggleClass('open');
    });

    // close the mobile nav when any nav link is clicked
    $('nav a').on('click', function() {
        $('nav').removeClass('open');
    });

});