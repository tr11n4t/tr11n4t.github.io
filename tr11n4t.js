
// Init the page
window.addEventListener("load", (e) => {

    // Loop over buttons in a navegation bar, adding event listeners
    for (let bttn of document.querySelectorAll("nav li > button"))
        bttn.addEventListener("click", (e) => {

            // Unfold the current item
            e.target.classList.toggle("unfolded");

            // Fold all button descendants
            for (let bttn of e.target.nextElementSibling.querySelectorAll(
                "li > button"))
                bttn.classList.remove("unfolded");
        })
});
