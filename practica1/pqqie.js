// Remove all the items in the navegation bar from the class `current' except
// the one provided as argument (if no `current' is provided, or if `status()'
// returns false, use the first item in the navegation bar).
// Furthermore, all sections are removed from class `current' except the one
// pointed to by the `current' argument.

function setNavSections(current = null, status = () => true) {

    // Remove error messages
    document.querySelectorAll('main > p.error').forEach(el => el.remove());

    // Get all the items in navegation bar
    let items = document.querySelectorAll("body > nav > ul > li");

    // Clear navegation bar and sections
    for (let item of items) {

        // Remove the item from the `current' class
        item.classList.remove("current");

        // Remove the corresponding section from the `current' class
        document.querySelector(item.firstElementChild.hash
                              ).classList.remove("current");
    }

    // Set the current item and section
    if (items.length > 0) {
        if (current === null || !status()) current = items[0];
        current.classList.add("current");
        document.querySelector(current.firstElementChild.hash
                              ).classList.add("current");
    }
}

//*****************************************************************************

// Remove all paragraph errors from the `main' element

function cleanError() {
    document.querySelectorAll('main > p.error').forEach(el => el.remove());
}

//*****************************************************************************

// Insert an error paragraph containing `message' at the beginning of the
// `main' element

function outputError(message) {

    // Remove all previous error messages
    cleanError();

    // Prepare a `p' element with the message
    let p = document.createElement("p");
    p.classList.add("error");
    p.innerHTML = message;

    // Insert the error paragraph at the beginning of main
    document.querySelector("main").prepend(p);
}

//*****************************************************************************

// Set an `input' element by adding some event listeners
// -- `inp' is the element to be set
// -- If present, `changeHandler' will be added as handler of a `change' event
// -- Other event handlers will added to `inp':
//    oo Handler to disable the mouse' wheel
//    oo Handler to disable the enter key

function setInputHandlers(inp, changeHandler = null) {

    // Add event listener for `change' event
    if (changeHandler !== null) inp.addEventListener("change", changeHandler);

    // Add event listener to disable the mouse's wheel
    inp.addEventListener("wheel", (e) => { e.preventDefault(); });

    // Add event listener to disable the enter key
    inp.addEventListener("keydown", (e) => {
        if (e.keyCode == 13) e.preventDefault(); });
}

//*****************************************************************************

// Create and return an `input' element for numbers.
// -- The attributes `type', `min', and `step' are set from the respective
//    arguments
// -- A `change' event is added to the element using `changeHandler' as its
//    handler
// -- Other event handlers will added to the element
//    oo Handler to disable the mouse' wheel
//    oo Handler to disable the enter key

function createInput4Number(type, min, step, changeHandler = null) {

    // Create element
    let inp = document.createElement("input");

    // Set attributes
    inp.type = type;
    if (inp.min != "") inp.min = min;
    inp.step = step;

    // Set handlers
    setInputHandlers(inp, changeHandler);

    // Return element
    return inp;
}
