
// Return a drop-down `select' element with the n,l symbols (1s, 2s, ...)

function nlDropDown() {
    const NMAX = 4;  // Maximum value of the `n' quantum number

    // Create `select' element
    let select = document.createElement("select");

    // Append the first option (??)
    let opt = document.createElement("option");
    opt.innerHTML = "??";
    opt.setAttribute("selected", "");
    opt.setAttribute("disabled", "");
    opt.setAttribute("hidden", "");
    select.append(opt);

    // Add all possible n,l values up to the maximum allowed n
    for (let n=1; n<=NMAX; ++n)
        for (let l=0; l<n; ++l) {
            let opt = document.createElement("option");
            let nl = nl2symbol(n, l);
            opt.innerHTML =  nl;
            opt.value = nl;
            select.append(opt);
        }

    // Return result
    return select;
}

//*****************************************************************************

// class `BForm' for handling the basis form

class BForm {

    constructor() { }

    //-------------------------------------------------------------------------

    // Initialize the basis form

    static init() {

        // Get the `tbody' element
        let tbody = document.querySelector("#basis > tbody");

        // Add a new (empty) row
        let row = tbody.insertRow(-1);
        BForm.setRow(row);
        row.firstElementChild.innerHTML = "1";
    }

    //-------------------------------------------------------------------------

    // Reindex the basis functions in the table
    static reIndex() {

        // Get the list of rows
        let rows = document.querySelector("#basis > tbody").children;

        // Reindex
        for (let i=0; i<rows.length; ++i)
            rows[i].firstElementChild.innerHTML = i+1;
    }

    //-------------------------------------------------------------------------

    // Set up the `i-th' row for the basis table

    static setRow(row) {

        // Add the cell for the function index
        row.insertCell(0);

        // Add a drop-down list for the function type, including an
        // event listener for `change' events
        {
            let select = nlDropDown();
            select.addEventListener("change", (e) => {
                cleanError();
                e.target.classList.remove("error");
                SForm.chngfnt(e.target.parentNode.parentNode.rowIndex-1); });
            row.insertCell(1).append(select);
        }

        // Add a number input field for the exponent, including an
        // event listener for `change' events
        {
            let expo = createInput4Number("number", "0", "any", (e) => {
                cleanError();
                let v = e.target.value;
                if (Number.isNaN(v) || v <= 0)
                    e.target.classList.add("error");
                else
                    e.target.classList.remove("error");
                SForm.chngfnt(e.target.parentNode.parentNode.rowIndex-1); });
            row.insertCell(2).append(expo);
        }

        // Add a small `New' button, with event listener
        {
            let bttn = document.createElement("button");
            bttn.innerHTML = "New";
            bttn.addEventListener("click", (e) => { BForm.newfnt(e); });
            bttn.classList.add("new");
            bttn.title = "Add a new basis function";
            bttn.classList.add("small");
            row.insertCell(3).append(bttn);
        }

        // Add a small `Remove' button, with event listener
        {
            let bttn = document.createElement("button");
            bttn.innerHTML = "&times;";
            bttn.addEventListener("click", (e) => { BForm.rmfnt(e); });
            bttn.classList.add("small", "remove");
            bttn.title = "Remove basis function";
            row.insertCell(4).append(bttn);
        }
    }

    //-------------------------------------------------------------------------

    // Add a new basis function (handler for a click on `New' button)

    static newfnt(event) {

        // Get the row containing the `New' button clicked
        let row = event.currentTarget.parentNode.parentNode;

        // Add a new row after the current one
        let newrow = document.createElement("tr");
        BForm.setRow(newrow);
        row.after(newrow);

        // Reindex the basis functions
        BForm.reIndex();

        // Add the basis function to all the subshells
        SForm.newfnt(row.rowIndex);

        // Flag that data should be checked
        checkAtomData();

        // Prevent default behaviour, which reloads the page
        event.preventDefault();
    }

    //-------------------------------------------------------------------------

    // Remove a basis function (handler for a click on `Remove' button)

    static rmfnt(event) {

        // Remove the row containing the clicked button, but making sure that
        // at least the header row and a function row remain in the table
        if (document.querySelector("#basis").rows.length > 2) {

            // Get row to be deleted
            let row = event.currentTarget.parentNode.parentNode;

            // Remove the basis function from the subshells data
            SForm.rmfnt(row.rowIndex-1);

            // Remove the row
            row.remove();
        }

        // Reindex the basis functions
        BForm.reIndex();

        // Flag that data should be checked
        checkAtomData();

        // Prevent default behaviour, which reloads the page
        event.preventDefault();
    }

    //-------------------------------------------------------------------------

    // Read the content of the basis form and return it

    static readForm() {

        // Loop over the rows in the table
        let content = [];
        let rows = document.querySelector("#basis").rows;
        for (let i=1; i<rows.length; ++i)
            content.push([rows[i].children[1].firstElementChild.value,
                          rows[i].children[2].firstElementChild.value]);

        // Return basis
        return content;
    }

    //-------------------------------------------------------------------------

    // Add the `j-th' control in the `i-th' basis function to error class
    static errorClass(i,j) {

        // Get the control element
        let el = document.querySelector("#basis").rows[i+1].
            children[j].firstElementChild;

        // Add it to the error class
        el.classList.add("error");
    }
}

//*****************************************************************************

// class `SForm' for handling the subshells form

class SForm {

    constructor() { }

    //-------------------------------------------------------------------------

    // Initialize the subshell form

    static init() {

        // Delete the cells in the subshell table
        document.querySelector("#subshells > tbody > tr").deleteCell(0);
    }

    //-------------------------------------------------------------------------

    // Default `change' event handler for number `input' fields

    static changeHandler(event) {
        cleanError();
        event.target.classList.remove("error");
        checkAtomData();
    }

    //-------------------------------------------------------------------------

    // Default `change' event handler for the parent of number `input' fields

    static changeParentHandler(event) {
        cleanError();
        event.target.parentNode.classList.remove("error");
        checkAtomData();
    }

    //-------------------------------------------------------------------------

    // Reindex the basis functions in all the subshells

    static reIndex() {

        // Get list of subshells
        let sshs = document.querySelector("#subshells > tbody > tr").children;

        // Loop over the subshells, reindexing the functions
        for (let ssh of sshs) {

            // Get list of basis functions
            let bfnts = ssh.querySelector("table > tbody").children;

            // Reindex
            for (let i=0; i<bfnts.length; ++i)
                bfnts[i].firstElementChild.innerHTML = i+1;
        }
    }

    //-------------------------------------------------------------------------

    // Add a new empty subshell

    static add() {

        // Clean errors
        cleanError();

        // Get body element of subshell table
        let body = document.querySelector("#subshells > tbody > tr");

        // Append the cell that will contain the new subshell
        let data = body.insertCell(-1);

        // Fold all the data cells, then unfold the new one
        for (let shell of body.children) shell.classList.remove("unfolded");
        data.classList.add("unfolded");

        // Append a button with the subshell label, to unfold the data
        {
            let bttn = document.createElement("button");
            bttn.innerHTML = "??";
            bttn.title = "Fold/unfold subshell";
            bttn.classList.add("small");
            bttn.addEventListener("click", (e) => { SForm.unfold(e); });
            data.append(bttn);
        }

        // Append a drop-down list for the subshell type, including an
        // event listener for `change' events
        {
            let select = nlDropDown();
            select.addEventListener("change", (e) => {
                cleanError();
                e.target.classList.remove("error");
                SForm.nlchange(e); });
            data.append(select);
        }

        // Append a `Remove' button, with event listener for `click' events
        {
            let bttn = document.createElement("button");
            bttn.innerHTML = "&times;";
            bttn.title = "Remove subshell";
            bttn.classList.add("small", "remove");
            bttn.addEventListener("click", (e) => { SForm.rmssh(e); });
            data.append(bttn);
        }

        // Append radio buttons for core/valence selection, with event
        // listeners for "change" events
        {
            // Put the radio buttons inside a paragraph
            let p = document.createElement("p");
            {
                let span = document.createElement("span");
                span.append("Core or valence?");
                p.append(span);
            }
            p.append(document.createElement("br"));

            // Get a unique ID
            let ID = "sshradio" + Date.now().toString();

            // Append `core' radio button
            {
                let inp = document.createElement("input");
                inp.type = "radio";
                inp.name = ID;
                inp.value = "core";
                inp.addEventListener("change", SForm.changeParentHandler);
                p.append(inp);
                let span = document.createElement("span");
                span.append("Core");
                p.append(span);
                p.append(document.createElement("br"));
            }

            // Append `valence' radio button
            {
                let inp = document.createElement("input");
                inp.type = "radio";
                inp.name = ID;
                inp.value = "valence";
                inp.addEventListener("change", SForm.changeParentHandler);
                p.append(inp);
                let span = document.createElement("span");
                span.append("Valence");
                p.append(span);

            }

            // Append the paragraph to the data cell
            data.append(p);
        }

        // Append a number input field for the number of electrons, with event
        // listener for "change" events
        {
            // Put the input field inside a paragraph
            let p = document.createElement("p");
            let span = document.createElement("span");
            span.append("Electrons:");
            p.append(span);

            // Append the input field to the paragraph
            {
                let ne = createInput4Number("number", "1", "1",
                                            SForm.changeParentHandler);
                p.append(ne);
            }

            // Append the paragraph to the data cell
            data.append(p);
        }

        // Append a table with the coefficients, with event listener for
        // "change" events
        {
            // Create the table
            let table = document.createElement("table");

            // Create and append the table's head
            let thead = document.createElement("thead");
            let row = document.createElement("tr");
            row.insertCell(0).innerHTML = "&chi;";
            row.insertCell(1).innerHTML = "c";
            thead.append(row);
            table.append(thead);

            // Create the table's body and fill it up
            let body = document.createElement("tbody");
            let basis = BForm.readForm();
            for (let i=0; i<basis.length; ++i) {

                // Insert a row for the current coefficient
                let row = body.insertRow(-1);

                // Insert the basis function cell
                row.insertCell(0).innerHTML = i+1;

                // Add a hidden input field for the coeficient
                let coe = row.insertCell(1);
                let inp = createInput4Number("hidden", "", "any",
                                             SForm.changeHandler);
                coe.append(inp);

                // Add the row to the `hidden' class;
                row.classList.add("hidden");
            }

            // Append the body to the table and the table to the data cell
            table.append(body);
            data.append(table);
        }

        // Flag that data should be checked
        checkAtomData();
    }

    //-------------------------------------------------------------------------

    // Unfold a subshell (handler for a click on the subshell button)

    static unfold(event) {

        // Get list of subshells data cells
        let bsshs = document.querySelector("#subshells > tbody > tr").children;

        // Get the index of the clicked label
        let i = event.currentTarget.parentNode.cellIndex;

        // Fold all the data cells but the clicked one, which is toggled
        for (let j=0; j<bsshs.length; ++j)
            if (j != i)
                bsshs[j].classList.remove("unfolded");
            else
                bsshs[j].classList.toggle("unfolded");

        // Prevent default behaviour, which reloads the page
        event.preventDefault();
    }

    //-------------------------------------------------------------------------

    // Handle a `change' event in the `nl' selector of a subshell

    static nlchange(event) {

        // Get the index of the clicked subshell
        let i = event.target.parentNode.cellIndex;

        // Get the data cell corresponding to the clicked subshell
        let ssdata = event.target.parentNode;

        // Get the new `nl' and `l' values
        let nl = ssdata.children[1].value;
        let l = symbol2nl(nl)[1];

        // Update the label
        ssdata.children[0].innerHTML = nl;

        // Get the `tbody' element where the coefficient table is
        let body = ssdata.querySelector("table > tbody");

        // Update the coefficients input field type ("number" or "hidden")
        let basis = BForm.readForm();
        for (let i=0; i<basis.length; ++i) {

            // If the basis function and the subshell have different `l',
            // the coefficient's input field should be hidden
            // Add/remove the row to/from the `hidden' class;
            let row = body.children[i];
            let inp = row.children[1].firstElementChild;
            if (nl != "??" && l == symbol2nl(basis[i][0])[1])
            {
                // Using type "text" because, for type "number", chrome in
                // Samsung phones does not show the minus sign in the keyboard
                inp.type = "text";
                row.classList.remove("hidden");
            } else {
                inp.type = "hidden";
                row.classList.add("hidden");
            }

        }

        // Flag that data should be checked
        checkAtomData();
    }

    //-------------------------------------------------------------------------

    // Remove a subshell (handler for a click on the `Remove' button)

    static rmssh(event) {

        // Get the index of the clicked subshell
        let i = event.currentTarget.parentNode.cellIndex;

        // Remove subshell
        document.querySelector("#subshells > tbody > tr").children[i].remove();

        // Flag that data should be checked
        checkAtomData();

        // Prevent default behaviour, which reloads the page
        event.preventDefault();
    }

    //-------------------------------------------------------------------------

    // Add a new basis function (at the `i-th' position) to all the subshells

    static newfnt(i) {

        // Get list of subshells
        let sshs = document.querySelector("#subshells > tbody > tr").children;

        // Loop over the subshells, inserting the new function
        for (let ssh of sshs) {
            let row = ssh.querySelector("table > tbody").insertRow(i);

            // Insert cell for function number
            row.insertCell(0);

            // Insert input field (hidden)
            let inp = createInput4Number("hidden", "0", "any",
                                         SForm.changeHandler);
            row.insertCell(1).append(inp);

            // Add the row to the `hidden' class;
            row.classList.add("hidden");
        }

        // Reindex the basis functions in all the shells
        SForm.reIndex();
    }

    //-------------------------------------------------------------------------

    // Remove the `i-th' basis function from all the subshells

    static rmfnt(i) {

        // Get list of subshells
        let sshs = document.querySelector("#subshells > tbody > tr").children;

        // Loop over the subshells, removing the function
        for (let ssh of sshs)
            ssh.querySelector("table > tbody").deleteRow(i);

        // Reindex the basis functions in all the shells
        SForm.reIndex();
    }

    //-------------------------------------------------------------------------

    // Change the `i-th' basis function in all the subshells

    static chngfnt(i) {

        // Get list of subshells
        let sshs = document.querySelector("#subshells > tbody > tr").children;

        // Prepare some info from the changed function
        let bfnt = BForm.readForm()[i];
        let l = symbol2nl(bfnt[0])[1];

        // Loop over the subshells, changing the function
        for (let ssh of sshs) {

            // Get the row corresponding to the basis function
            let row = ssh.querySelector("table > tbody").rows[i];

            // Get `nl' for the current subshell
            let nl = ssh.children[1].value;

            // If the basis function and the subshell have different `l',
            // the coefficient's input field should be hidden
            // Add/remove the row to/from the `hidden' class;
            let inp = row.cells[1].firstElementChild;
            if (nl != "??" && l == symbol2nl(nl)[1]) {
                // Using type "text" because, for type "number", chrome in
                // Samsung phones does not show the minus sign in the keyboard
                inp.type = "text";
                row.classList.remove("hidden");
            } else {
                inp.type = "hidden";
                row.classList.add("hidden");
            }
        }

        // Flag that data should be checked
        checkAtomData();
    }

    //-------------------------------------------------------------------------

    // Read the content of the subshells form and return it

    static readForm() {

        // Get list of subshells
        let sshs = document.querySelector("#subshells > tbody > tr").children;

        // Loop over the subshells, reading data
        let content = [];
        for (let ssh of sshs) {

            // Get the controls in the subshell
            let crtls = ssh.children;

            // Get the `nl' value
            let sdata = [crtls[1].value];

            // Get core/valence info
            let cv = "";
            if (crtls[3].children[2].checked) cv = "c";
            if (crtls[3].children[5].checked) cv = "v";
            sdata.push(cv);

            // Get number of electrons
            sdata.push(crtls[4].children[1].value);

            // Get coefficients
            let inps = crtls[5].querySelectorAll("input");
            let coe = [];
            for (let inp of inps) coe.push(inp.value);
            sdata.push(coe);

            // Add subshell data to content
            content.push(sdata);
        }

        // Return subshells data
        return content;
    }

    //-------------------------------------------------------------------------

    // Add the `j-th' control in the `i-th' subshell to error class
    static errorClass(i,j) {

        // Get list of subshells
        let sshs = document.querySelector("#subshells > tbody > tr").children;

        // Fold all the subshells
        for (let ssh of sshs) ssh.classList.remove("unfolded");

        // Unfold the `i-th' subshell
        sshs[i].classList.add("unfolded");

        // Add the `j-th' control to the error class
        sshs[i].children[j].classList.add("error");
    }

    //-------------------------------------------------------------------------

    // Add the `j-th' coeficient of the `i-th' subshell to error class

    static errorClass4coe(i,j) {

        // Get list of subshells
        let sshs = document.querySelector("#subshells > tbody > tr").children;

        // Fold all the subshells
        for (let ssh of sshs) ssh.classList.remove("unfolded");

        // Unfold the `i-th' subshell
        sshs[i].classList.add("unfolded");

        // Get input control field for coefficients
        let inps = sshs[i].children[5].querySelectorAll("input");

        // Add the `j-th' coefficient to the error class
        inps[j].classList.add("error");
    }
}

//*****************************************************************************

// Class for handling the creation of SVG graphics

class SVG {

    // Private fields
    // `width_' and `height_' give the graphic's dimensions
    // `xa_' and `ya_' are the coordinates of the bottom-left corner
    // `xb_' and `yb_' are the coordinates of the top-right corner
    // `svg_' is the `svg' element containing the graphic

    //-------------------------------------------------------------------------

    // Create and return `svg' elements and children of `svg' elements
    //  -- `tag' is the tag name of the element to be created

    static createElement(tag) {
        const XML = "http://www.w3.org/2000/svg"; // XML namespace

        return document.createElementNS(XML, tag);
    }

    //-------------------------------------------------------------------------

    // Constructor.
    //  -- `width' and `height' give the graphic's dimensions
    //  -- `xa' and `ya' are the coordinates of the bottom-left corner
    //  -- `xb' and `yb' are the coordinates of the top-right corner

    constructor(width, height , xa, ya, xb, yb) {

        // Set private fields
        this.width_ = width;
        this.height_ = height;
        this.xa_ = xa;
        this.ya_ = ya;
        this.xb_ = xb;
        this.yb_ = yb;

        // Create the `svg' element
        this.svg_ = SVG.createElement("svg");
        this.svg_.setAttribute("viewBox",
                               `0 0 ${this.width_} ${this.height_}`);
    }

    //-------------------------------------------------------------------------

    // Grant access to the `svg' element

    svg() {
        return this.svg_;
    }

    //-------------------------------------------------------------------------

    // Grant access to the bounding cartesian coordinates

    xa() { return this.xa_; }
    xb() { return this.xb_; }
    ya() { return this.ya_; }
    yb() { return this.yb_; }

    //-------------------------------------------------------------------------

    // `x' to `i' conversion

    x2i(x) {
        return this.width_*(x - this.xa_)/(this.xb_ - this.xa_);
    }

    // `y' to `j' conversion

    y2j(y) {
        return this.height_*(1 - (y - this.ya_)/(this.yb_ - this.ya_));
    }

    //-------------------------------------------------------------------------

    // Add text to the `svg' graphic
    // -- `x' and `y' is where the text will be placed
    // -- `s' is the string of text to be added
    // -- `halign' is the horizontal alignment: `l' (left), `c' (center), or
    //    `r' (right)
    // -- `valign' is the vertical alignment: `t' (top), `c' (center), or
    //    `b' (bottom)

    text(x, y, s, halign="c", valign="c") {

        // Create a `text' element
        let txt = SVG.createElement("text");
        txt.setAttribute("x", this.x2i(x));
        txt.setAttribute("y", this.y2j(y));

        // Set horizontal alignment
        switch(halign) {
        case "l":
            txt.setAttribute("text-anchor", "start");
            break;
        case "r":
            txt.setAttribute("text-anchor", "end");
            break;
        default:
            txt.setAttribute("text-anchor", "middle");
            break;
        }

        // Set vertical alignment
        switch(valign) {
        case "t":
            txt.setAttribute("dominant-baseline", "hanging");
            break;
        case "b":
            txt.setAttribute("dominant-baseline", "auto");
            break;
        default:
            txt.setAttribute("dominant-baseline", "middle");
            break;
        }

        // Add text to `text' element
        txt.append(s);

        // Add `text' element to `svg'
        this.svg_.append(txt);
    }

    //-------------------------------------------------------------------------

    // Add a line from `(x1,y1)' to `(x2,y2)'.  If `clss' is given, add the
    // corresponding `line' element to class `clss'

    line(x1, y1, x2, y2, clss="") {

        // Create a `line' element
        let line = SVG.createElement("line");
        line.setAttribute("x1", this.x2i(x1));
        line.setAttribute("y1", this.y2j(y1));
        line.setAttribute("x2", this.x2i(x2));
        line.setAttribute("y2", this.y2j(y2));

        // Add element to class `clss' if necessary
        if (clss) line.classList.add(clss);

        // Add `line' element to `svg'
        this.svg_.append(line);
    }

    //-------------------------------------------------------------------------

    // Add a `tick' below the X axis

    xtick(x, label="") {
        const TICKLENGTH = 2 * (this.yb_ - this.ya_) / 100;

        // Create a `line' element
        let line = SVG.createElement("line");
        line.setAttribute("x1", this.x2i(x));
        line.setAttribute("y1", this.y2j(0));
        line.setAttribute("x2", this.x2i(x));
        line.setAttribute("y2", this.y2j(-TICKLENGTH));

        // Add `line' element to `svg'
        this.svg_.append(line);

        // Add the label if not empty
        if (label) this.text(x, -2*TICKLENGTH, label, "c", "t");
    }

    //-------------------------------------------------------------------------

    // Add a `tick' at the left of the Y axis

    ytick(y, label="") {
        const TICKLENGTH = 2 * (this.xb_ - this.xa_) / 100;

        // Create a `line' element
        let line = SVG.createElement("line");
        line.setAttribute("x1", this.x2i(0));
        line.setAttribute("y1", this.y2j(y));
        line.setAttribute("x2", this.x2i(-TICKLENGTH));
        line.setAttribute("y2", this.y2j(y));

        // Add the `line' element to `svg'
        this.svg_.append(line);

        // Add the label if not empty
        if (label) this.text(-2*TICKLENGTH, y, label, "r", "c");
    }

    //-------------------------------------------------------------------------

    // Add a path created from the piecewise cubic spline `s'

    path(s) {

        // Compose the `d' atribute from the spline (first point)
        let [x0, y0, x1, y1, x2, y2, x3, y3] = s.bezier(0);
        let d = "M " + this.x2i(x0).toFixed(1) + ","
            + this.y2j(y0).toFixed(1);

        // Add remaining points to the `d' atribute
        for (let i=0; i+1<s.n(); ++i) {
            d += "\n";
            [x0, y0, x1, y1, x2, y2, x3, y3] = s.bezier(i);
            d += "C " + this.x2i(x1).toFixed(1) + ","
            + this.y2j(y1).toFixed(1);
            d += " " + this.x2i(x2).toFixed(1) + ","
            + this.y2j(y2).toFixed(1);
            d += " " + this.x2i(x3).toFixed(1) + ","
            + this.y2j(y3).toFixed(1);
        }
        d += "\nZ";

        // Create a `path' element
        let path = SVG.createElement("path");
        path.setAttribute("d", d);

        // Add `path' element to `svg'
        this.svg_.append(path);
    }
}

//*****************************************************************************

// class `AtomData', for handling the atomic data input process

class AtomData {

    // Private fields
    // -- `check_' is a boolean used to flag that data should be checked
    // -- `rho_' is an `AtomoRho' containing the atomic densities
    // -- `runs_' is contains previous R/Q runs: `[ ..., [R,Q], ...]'
    // -- `previousQ_' is the expected sphere charge in previous run

    //-------------------------------------------------------------------------

    constructor() {
        this.check_ = true;
        this.rho_ = new AtomRho();
        this.runs_ = [];
        this.previousQ_ = 0;
    }

    //-------------------------------------------------------------------------

    // Initialize the page

    static init() {

        // Initialize the basis and subshells forms
        BForm.init();
        SForm.init();

        // Set Q and R to its default values
        document.querySelector("#Rad-Q").value = "99.0";
        document.querySelector("#Rad-R").value = "";

        // Set radio buttons for densities
        {
            // Get list of radio buttons
            let rbs = [document.querySelector("#Rho-total"),
                      document.querySelector("#Rho-cv"),
                      document.querySelector("#Rho-ss")];

            // Uncheck radio buttons and add listener for `change' event
            for (let rb of rbs) {
                rb.checked = false;

                // Add event listener
                rb.addEventListener("change", (e) => {

                    // Get all `svg' elements
                    let svgs = document.querySelectorAll("#Rho > svg");

                    // Remove all svgs from `current' class
                    for (let svg0 of svgs) svg0.classList.remove("current");

                    // Add current svg to `current class
                    let i = 2;
                    if (e.target.value == "t") i = 0;
                    if (e.target.value == "cv") i = 1;
                    svgs[i].classList.add("current");
                });

            }
        }
    }

    //-------------------------------------------------------------------------

    // Set the change flag to `true'
    check() {
        this.check_ = true;
    }
    
    //-------------------------------------------------------------------------

    // Set the expected value for radii
    set_radii() {

        // Get the corresponding `tr' element
        let row = document
            .querySelector("#Rad > table:first-of-type > tbody > tr");

        // Set the radii
        row.children[0].innerHTML = this.rho_.cradius.toFixed(4);
        row.children[1].innerHTML = this.rho_.vradius.toFixed(4);
        row.children[2].innerHTML = this.rho_.aradius.toFixed(4);
    }

    //-------------------------------------------------------------------------

    // Handler for R% button

    radSphere() {

        // Clean up errors
        cleanError();

        // Get the `section' corresponding to `radii'
        let section = document.querySelector("#Rad");

        // Remove, if present, the table with results from previous runs
        let table = section.querySelector("#Rad-percent");
        if (table) table.remove();

        // Read input: charge and radius
        let Q;
        let R;
        try {

            // Read and validate Q
            Q = parseFloat(section.querySelector("#Rad-Q").value);
            if (Number.isNaN(Q) || Q < 0 || Q > 100)
                throw new RangeError("Invalid charge %");

            // Read and validate R
            R = parseFloat(section.querySelector("#Rad-R").value);
            if (Number.isNaN(R) || R < 0)
                throw new RangeError("Invalid R<sub>%</sub>");
        }
        catch (e) {
            outputError(e.message);
            return;
        }

        // If `Q' has changed from previous run, clear previous runs
        if (Q != this.previousQ_) {
            this.runs_.splice(0, this.runs_.length);
            this.previousQ_ = Q;
        }

        // Compute current percentage of charge
        let q = 100 * this.rho_.aqr(R) / this.rho_.ane;

        // Update previous runs
        let i0 = Number.MAX_VALUE; // index of right bracket
        {
            const NRUNSMAX = 10; // Maximum number of runs to be saved

            // Add current value to the array of previous runs
            this.runs_.push([R,q]);

            // Sort
            this.runs_.sort((a, b) => a[0] - b[0]);

            // Left-bracket the target charge percentage
            for (const [i, rq] of this.runs_.entries()) {
                if (rq[1] > Q) {
                    i0 = i;
                    break;
                }
            }

            // If the number of runs exceeds the maximum, trim the array
            while (this.runs_.length > NRUNSMAX) {
                if (i0 < this.runs_.length-i0)
                    this.runs_.pop();
                else {
                    this.runs_.shift();
                    i0--;
                }
            }
        }

        // Print runs as an HTML table
        {
            // Number of digits after the decimal point
            const NDIGITS = 4;

            // Create a table element
            // Note that according to the specifications, `insertRow' will
            // create a `tbody' in no one exists in the table.  See
            //    https://html.spec.whatwg.org/multipage/tables.html
            let table = document.createElement("table");
            table.id = "Rad-percent";

            // Insert table header
            let header = table.insertRow(-1);
            header.insertCell(0).innerHTML = "R<sub>%</sub>";
            header.insertCell(1).innerHTML = "Charge %";

            // Loop over runs
            for (const [i, rq] of this.runs_.entries()) {

                // Insert a row at the end of the table
                let row = table.insertRow(-1);

                // If the run is part of the bracket, add to class `near'
                if (i+1 == i0 || i == i0) row.classList.add("near");

                // Insert two cells with the data
                row.insertCell(0).append(rq[0].toFixed(NDIGITS));
                row.insertCell(1).append(rq[1].toFixed(NDIGITS));
            }

            // Append table to section
            section.append(table);
        }
    }

    //-------------------------------------------------------------------------

    // Add XY axes to an object of class `SVG'.
    //  -- `svg' is the object where the axes will be added to

    static axes(svg) {
        const dx = Math.abs(svg.xa());
        const dy = Math.abs(svg.ya());

        // Draw grid's vertical lines (will be added to class `grid')
        let x = dx/5;
        while (x < svg.xb()+dx/10) {
            svg.line(x, 0, x, svg.yb(), "grid");
            x += dx/5;
        }

        // Draw grid's horizontal lines (will be added to class `grid')
        let y = dy/5;
        while (y < svg.yb()+dy/10) {
            svg.line(0, y, svg.xb(), y, "grid");
            y += dy/5;
        }

        // Draw axes
        svg.line(svg.xa(), 0, svg.xb(), 0);
        svg.line(0, svg.ya(), 0, svg.yb());

        // Draw ticks for the X axis
        x = dx;
        while (x < svg.xb()) {
            svg.xtick(x, x.toFixed(1));
            x += dx;
        }

        // Draw ticks for the Y axis
        y = dy;
        while (y < svg.yb()) {
            svg.ytick(y, y.toFixed(1));
            y += dy;
        }

        // Draw axis' labels
        svg.text(svg.xb()-(svg.xb()-svg.xa())/100, -(svg.yb()-svg.ya())/100,
                 "r", "r", "t");
        svg.text(-(svg.xb()-svg.xa())/100, svg.yb(), "ρ", "r", "t");
    }

    //-------------------------------------------------------------------------

    // Add `svg' elements with the densities' graphics

    rhoGraphics() {
        const WIDTH= 400;   // Images' width
        const HEIGHT= 300;  // Images' height

        // Get the `section' corresponding to `radii'
        let section = document.querySelector("#Rho");

        // Remove, all `svg' elements in the section
        for (let svg of section.querySelectorAll("#Rho > svg"))
            svg.remove();

        // Get splines for the total density
        let tRho;
        {
            const TRIMEPS = 0.001;  // Tolerance for spline trimming

            // Create spline `s0'
            let s0 = new Spline();

            // Add points to `s0' (interval: 0 <= r <= 100)
            let r1 = 0;
            let h = 0.5;
            let n = 50;
            while (r1 <= 100.0) {
                let r0 = r1;
                r1 += h;
                let h0 = h/n;
                for (let i=0; i<n; ++i) {
                    let r = r0 + i*h0;
                    s0.add(r, this.rho_.arho(r));
                }
                h *= 2;
            }

            // Update spline
            s0.update(0,0);

            // Trim spline
            let err;
            [tRho,err] = trimSpline(s0, TRIMEPS);
        }

        // Get list of radio buttons
        let rbs = [document.querySelector("#Rho-total"),
                   document.querySelector("#Rho-cv"),
                   document.querySelector("#Rho-ss")];

        // Get cartesian bounds of the image
        let xa, ya, xb, yb;
        {
            // Set `xb'
            const MINRHO = 0.1;
            let n3 = 3*(tRho.n()-1)+1;
            while (tRho.data()[n3] < MINRHO) n3 -= 3;
            xb = Math.ceil(tRho.data()[n3-1]);

            // Set `yb'
            yb = 0;
            n3 = 1;
            while (n3 < 3*tRho.n()) {
                yb = (yb > tRho.data()[n3]) ? yb : tRho.data()[n3];
                n3 += 3;
            }
            yb = 1 + Math.ceil(yb);

            // Set `xa' and `ya';
            xa = -0.5;
            ya = (yb >= 7) ? -2.0 : -1.0;
        }

        // Create image for total density
        {
            // Create image
            let svg = new SVG(WIDTH, HEIGHT, xa, ya, xb, yb);

            // Add axes
            AtomData.axes(svg);

            // Add title
            svg.text(xb, yb, "Total (ρ,r in a.u.)", "r", "t");

            // Add total density
            svg.path(tRho);

            // If current density, add to `current' class
            if (rbs[0].checked) svg.svg().classList.add("current");

            // Append the image to the section
            section.append(svg.svg());
        }

        // Create image for core/valence density
        {
            // Create image
            let svg = new SVG(WIDTH, HEIGHT, xa, ya, xb, yb);

            // Add axes
            AtomData.axes(svg);

            // Add title
            svg.text(xb, yb, "Core/valence (ρ,r in a.u.)", "r", "t");

            // Compute core and valence density
            let cRho = new Spline();
            let vRho = new Spline();
            for (let i=0; i<tRho.n(); ++i) {
                let r = tRho.data()[3*i];
                cRho.add(r, this.rho_.crho(r));
                vRho.add(r, this.rho_.vrho(r));
            }
            cRho.update(0,0);
            vRho.update(0,0);

            // Add core and valence density
            svg.path(cRho);
            svg.path(vRho);

            // Find maximum for core density
            let cx;
            let cy = 0;
            for (let i=0; i<cRho.n(); ++i) {
                let y = cRho.data()[3*i+1];
                if (y> cy) {
                    cy = y;
                    cx = cRho.data()[3*i];
                }
            }

            // Find maximum for valence density
            let vx;
            let vy = 0;
            for (let i=0; i<vRho.n(); ++i) {
                let y = vRho.data()[3*i+1];
                if (y> vy) {
                    vy = y;
                    vx = cRho.data()[3*i];
                }
            }

            // Label core and valence densities
            svg.text(cx+0.05, cy+0.2, "Core", "l", "b");
            svg.text(vx+0.05, vy+0.2, "Valence", "l", "b");

            // If current density, add to `current' class
            if (rbs[1].checked) svg.svg().classList.add("current");

            // Append the image to the section
            section.append(svg.svg());
        }

        // Create image for subshell densities
        {
            // Create image
            let svg = new SVG(WIDTH, HEIGHT, xa, ya, xb, yb);

            // Add axes
            AtomData.axes(svg);

            // Add title
            svg.text(xb, yb, "Subshell (ρ,r in a.u.)", "r", "t");

            // Compute core's subshell densities (get `nl' too)
            let ssRhos = [];
            let nl = [];
            for (let rho of this.rho_.css) {
                let s = new Spline();
                for (let j=0; j<tRho.n(); ++j) {
                    let r = tRho.data()[3*j];
                    s.add(r, rho.rho(r));
                }
                s.update(0,0);
                ssRhos.push(s);
                nl.push(nl2symbol(rho.n, rho.l));
            }

            // Compute valence's subshell densities (get `nl' too)
            for (let rho of this.rho_.vss) {
                let s = new Spline();
                for (let j=0; j<tRho.n(); ++j) {
                    let r = tRho.data()[3*j];
                    s.add(r, rho.rho(r));
                }
                s.update(0,0);
                ssRhos.push(s);
                nl.push(nl2symbol(rho.n, rho.l));
            }

            // Add subshell densities
            for (let rho of ssRhos) svg.path(rho);

            // Loop over subshell densities, adding labels
            for (let [i,rho] of ssRhos.entries()) {

                // Find maximum
                let sx;
                let sy = 0;
                for (let j=0; j<rho.n(); ++j) {
                    let y = rho.data()[3*j+1];
                    if (y> sy) {
                        sy = y;
                        sx = rho.data()[3*j];
                    }
                }

                // Add label
                svg.text(sx+0.05, sy+0.2, nl[i], "l", "b");
            }

            // If current density, add to `current' class
            if (rbs[2].checked) svg.svg().classList.add("current");

            // Append the image to the section
            section.append(svg.svg());
        }
    }

    //-------------------------------------------------------------------------

    // Check the data's status, reading and checking the forms, and generating
    // subshells and atomic densities 

    status() {

        // If no checking is required, we are done.
        if (!this.check_) return true;

        // Read basis form
        let bform = BForm.readForm();

        // Check basis data
        try {

            // Loop over basis functions
            for (let i=0; i<bform.length; ++i) {

                // Check `nl'
                let nl = bform[i][0];
                if (nl == "??") {
                    BForm.errorClass(i,1);
                    throw new RangeError("Wrong basis function type");
                }

                // Check exponent
                let expo = parseFloat(bform[i][1]);
                if (Number.isNaN(expo) || expo <= 0) {
                    BForm.errorClass(i,2);
                    throw new RangeError("Wrong &xi; value");
                }
            }
        }
        catch(e) {
            outputError(e.message);
            return false;
        }

        // Read subshells
        let sform = SForm.readForm();

        // Check subshell data
        try {

            // Check number of subshells
            if (sform.length == 0)
                throw new RangeError("No subshells found");

            // Loop over subshells
            for (let i=0; i<sform.length; ++i) {

                // Check `nl'
                let nl = sform[i][0];
                if (nl == "??") {
                    SForm.errorClass(i,1);
                    throw new RangeError("Wrong subshell function type");
                }

                // Check core/valence
                if (sform[i][1] == "") {
                    SForm.errorClass(i,3);
                    throw new RangeError("Core or valence subshell?");
                }

                // Check number of electrons
                let l = symbol2nl(nl)[1];
                let ne = parseInt(sform[i][2]);
                let nemax = 4*l + 2;
                if (!Number.isInteger(ne) || ne <= 0 || ne > nemax) {
                    SForm.errorClass(i,4);
                    throw new RangeError("Wrong number of electrons");
                }

                // Check coefficients
                let coes = sform[i][3];
                for (let j=0; j<coes.length; ++j) {
                    let coe = parseFloat(coes[j]);
                    if (l == symbol2nl(bform[j][0])[1] &&
                        (Number.isNaN(coe) || coe == 0)) {
                        SForm.errorClass4coe(i,j);
                        throw new RangeError("Wrong c value");
                    }
                }
            }
        }
        catch(e) {
            outputError(e.message);
            return false;
        }

        // Loop over the subshell and create the `SubShell' objects
        let csshs = [];
        let vsshs = [];
        for (let i=0; i<sform.length; ++i) {

            // Prepare the number of electrons, `n', and `l'
            let ne = parseInt(sform[i][2]);
            let [n, l] = symbol2nl(sform[i][0]);

            // Prepare basis functions and coeffitients
            let bfnts = [];
            let coes = [];
            for (let j=0; j<bform.length; ++j) {
                let [n0, l0] = symbol2nl(bform[j][0]);
                if (l0 == l) {
                    bfnts.push([n0, l0, parseFloat(bform[j][1])]);
                    coes.push(parseFloat(sform[i][3][j]));
                }
            }

            // Create a core or valence `SubShell' object
            if (sform[i][1] == "c")
                csshs.push(new SubShell(ne, n, l, bfnts, coes));
            else
                vsshs.push(new SubShell(ne, n, l, bfnts, coes));
        }

        // Check normalization of subshells
        try {
            const NORMTOL = 0.001; //Tolerance for normalization constants

            // Check core subshells
            for(let ssh of csshs)
                if (Math.abs(ssh.ne-ssh.q) > NORMTOL*ssh.ne)
                    throw new RangeError("Subshell is not normalized");

            // Check valence subshells
            for(let ssh of vsshs)
                if (Math.abs(ssh.ne-ssh.q) > NORMTOL*ssh.ne)
                    throw new RangeError("Subshell is not normalized");
        }
        catch(e) {
            outputError(e.message);
            return false;
        }

        // Validation passed.  No more checks needed
        this.check_ = false;

        // Create the `AtomRho' object
        this.rho_ = new AtomRho(csshs, vsshs);

        // Set the expected value for radii
        this.set_radii();

        // Clean up R% table and previous runs
        {
            // Remove previous table
            let table = document.querySelector("#Rad-percent");
            if (table) table.remove();

            // Clear previous runs
            this.runs_.splice(0, this.runs_.length);
            this.previousQ_ = 0;

            // Initialize trial `R'
            document.querySelector("#Rad-R").value = "";
        }

        // Add densities's graphics
        this.rhoGraphics();

        // Return true, as no more checking is necessary
        return !this.check_;
    }
}

//*****************************************************************************

// A closure for `AtomData' methods

let [checkAtomData, statusAtomData, radiusAtomData] = (function() {

    // Private data containing the subshells and atomic densities
    let data = new AtomData();

    // Wrappers for some `AtomData' methods
    return [function() { return data.check(); },
            function() { return data.status(); },
            function() { data.radSphere(); }];
}());

//*****************************************************************************

// Init the page
window.addEventListener("load", (e) => { AtomData.init(); });

// Initialize navegation bar and sections
setNavSections();

// Add event listener for `New' in subshells form, preventing default, which
// will reload the page
document.querySelector("#Inp-subshells-new"
                      ).addEventListener("click", (e) => {
                          SForm.add();
                          event.preventDefault();
                      });

// Add event listener for `Get charge %' button, preventing default, which
// will reload the page
document.querySelector("#Rad-button").
    addEventListener("click", (e) => {
        radiusAtomData();
        event.preventDefault();
    });

// Loop over all items in the navegation bar, adding event listeners
for (let item of document.querySelectorAll("body > nav > ul > li"))
    item.addEventListener("click", (e) => {
        setNavSections(item, statusAtomData); });

// Disable the ENTER key and the mouse's wheel in the `input' elements
// existing in the HTML code
for (let inp of document.querySelectorAll("input")) setInputHandlers(inp);
