//*****************************************************************************

// Create/update the E/R table

function EvsR() {
    const NDIGITS = 4; // Number of digits after the decimal point

    // Remove all previous error messages
    cleanError();

    // Get the `section' where the table should be included into
    let section = document.querySelector("#EvsR");

    // If the table is already there, remove it
    if (section.childElementCount == 3) section.children[2].remove();

    // Get input
    let Rmin = parseFloat(document.querySelector("#EvsR-min").value);
    let Rmax = parseFloat(document.querySelector("#EvsR-max").value);
    let Rinc = parseFloat(document.querySelector("#EvsR-inc").value);
    let alpha = parseFloat(document.querySelector("#EvsR-alpha").value);

    // Validate input
    try {
        if (alpha <= 0 || Number.isNaN(alpha))
            throw new RangeError("Invalid &xi;");
        if (Rmin <= 0 || Number.isNaN(Rmin))
            throw new RangeError("Invalid minimum R");
        if (Rmax <= 0 || Number.isNaN(Rmax) || Rmax <= Rmin)
            throw new RangeError("Invalid maximum R");
        if (Rinc <= 0 || Number.isNaN(Rinc))
            throw new RangeError("Invalid &#x2206;R");
    }
    catch(e) {
        outputError(e.message);
        return;
    }

    // Create a table element
    // Note that according to the specifications, `insertRow' will
    // create a `tbody' in no one exists in the table.  See
    //    https://html.spec.whatwg.org/multipage/tables.html
    let table = document.createElement("table");

    // Insert table header
    let header = table.insertRow(-1);
    header.insertCell(0).innerHTML = "R";
    header.insertCell(1).innerHTML = "MO";
    header.insertCell(2).innerHTML = "VB";
    header.insertCell(3).innerHTML = "CF";
    header.insertCell(4).innerHTML = "&gamma;";

    // Loop over `R' values
    for (let R=Rmin; R<=Rmax+Rinc/2; R += Rinc) {

        // Insert a row at the end of the table
        let row = table.insertRow(-1);

        // Get MO, VB, CF data
        let h2 = new H2qchem(R,alpha);

        // Insert five cells with the data
        row.insertCell(0).append(R.toFixed(NDIGITS));
        row.insertCell(1).append(h2.MO.toFixed(NDIGITS));
        row.insertCell(2).append(h2.VB.toFixed(NDIGITS));
        row.insertCell(3).append(h2.CF.toFixed(NDIGITS));
        row.insertCell(4).append(h2.gamma.toFixed(NDIGITS));
    }

    // Append the table
    section.append(table);
}

//*****************************************************************************

// Helper class to assist in a manual optimization process

class PreviousRuns {

    // `Private' fields
    // -- `method_' is the method (MO, VB, or CF)
    // -- `parameter_' could be the `alpha' value (for `R' optimization) or
    //    the `R' value (for `alpha' optimization)
    // -- `runs_' is an array containing previous runs: `[ ..., [x,y], ...]'
    // -- `imin_' is the index corresponding to the minimum of `runs_'
    // -- `ID_' is the `id' attribute used for the HTML section
    // -- `xname_' is name of the variable being optimized (`R' or `alpha')
    // -- `customize_(alpha,R)' is a function that returns `[parameter, x]':
    //    oo For `R' optimization, `(alpha, R) => [alpha,R]'.
    //    oo For `alpha' optimization, `(alpha, R) => [R,alpha]'.

    //-------------------------------------------------------------------------

    // Constructor
    // -- `ID' is the `id' attribute used for the HTML section
    // -- `xname' is name of the variable being optimized (`R' or `alpha')
    // -- `customize' is the `customize_(alpha,R)' function to be used 

    constructor(ID, xname, customize) {
        this.method_ = "";
        this.parameter_ = 0;
        this.runs_ = [];
        this.imin_ = 0;
        this.ID_ = ID;
        this.xname_ = xname;
        this.customize_ = customize;
    }

    //-------------------------------------------------------------------------

    // Read `method', `alpha', and `R' and return them as `[method, alpha, R]'
    // -- `ID' is the `id' attribute used for the HTML section

    static getinput(ID) {

        // Get the method selected
        let method = "";
        if (document.querySelector(ID+"-MO").checked) method = "MO";
        if (document.querySelector(ID+"-VB").checked) method = "VB";
        if (document.querySelector(ID+"-CF").checked) method = "CF";

        // Get alpha and R
        let alpha = parseFloat(document.querySelector(ID+"-alpha").value);
        let R = parseFloat(document.querySelector(ID+"-R").value);

        // Validate Input
        if (method === "") throw new RangeError("No method selected");
        if (alpha <= 0 || Number.isNaN(alpha))
            throw new RangeError("Invalid &xi;");
        if (R <= 0 || Number.isNaN(R))
            throw new RangeError("Invalid R");

        // Return result
        return [method, alpha, R];
    }

    //-------------------------------------------------------------------------

    // Update the array of previous runs, where
    // -- `method' and `parameter' are the values corresponding to the current
    //    run
    // -- `y' is the current energy, `x' the variable at which it was computed

    update(method, parameter, x, y) {
        const NRUNSMAX = 9; // Maximum number of runs to be saved

        // If `method' or `parameter' have changed, clear previous runs
        if (method != this.method_ || parameter != this.parameter_) {
            this.runs_.splice(0, this.runs_.length);
            this.method_ = method;
            this.parameter_ = parameter;
        }

        // Add `[x, y]' to the array of previous runs
        this.runs_.push([x,y]);

        // Sort
        this.runs_.sort((a, b) => a[0] - b[0]);

        // Find index of minimum value in runs
        let ymin = Number.MAX_VALUE;
        this.imin_ = 0;
        for (const [i, er] of this.runs_.entries()) {
            if (er[1] < ymin) {
                ymin = er[1];
                this.imin_ = i;
            }
        }

        // If the number of runs exceeds the maximum, trim the array
        while (this.runs_.length > NRUNSMAX) {
            if (this.imin_ < this.runs_.length-1-this.imin_)
                this.runs_.pop();
            else {
                this.runs_.shift();
                this.imin_--;
            }
        }
    }

    //-------------------------------------------------------------------------

    // Generate an HTML table from the array of previous runs
    // -- `xlabel' and `ylabel' are used for the table header

    table(xlabel, ylabel) {

        // Prints results into an HTML table
        {
            // Number of digits after the decimal point
            const NDIGITS = 7;

            // Create a table element
            // Note that according to the specifications, `insertRow' will
            // create a `tbody' in no one exists in the table.  See
            //    https://html.spec.whatwg.org/multipage/tables.html
            let table = document.createElement("table");

            // Insert table header
            let header = table.insertRow(-1);
            header.insertCell(0).innerHTML = xlabel;
            header.insertCell(1).innerHTML = ylabel;

            for (const [i, er] of this.runs_.entries()) {

                // Insert a row at the end of the table
                let row = table.insertRow(-1);

                // If this run is the minimum, add to class `minimum'
                if (i == this.imin_) row.classList.add("minimum");

                // If the run is nearest to the minimun, add to class `near'
                if (i == this.imin_-1 || i == this.imin_+1)
                    row.classList.add("near");

                // Insert two cells with the data
                row.insertCell(0).append(er[0].toFixed(NDIGITS));
                row.insertCell(1).append(er[1].toFixed(NDIGITS));
            }
            return table;
        }
    }

    //-------------------------------------------------------------------------

    handler() {

        // Remove all previous error messages
        cleanError();

        // Get the `section' corresponding to R optimization
        let section = document.querySelector(this.ID_);

        // Remove, if present, the table with results from previous runs
        if (section.childElementCount == 4) section.children[3].remove();

        // Get input (`method', `alpha', and `R')
        let method, alpha, R;
        try {
            [method, alpha, R] = PreviousRuns.getinput(this.ID_);
        }
        catch(e) {
            outputError(e.message);
            return;
        }

        // Compute energy
        let E;
        {
            let h2 = new H2qchem(R,alpha);
            if (method == "MO") E = h2.MO;
            if (method == "VB") E = h2.VB;
            if (method == "CF") E = h2.CF;
        }

        // Get `parvalue' and `varvalue'
        let [parvalue, varvalue] = this.customize_(alpha, R);

        // Update previous runs
        this.update(method, parvalue, varvalue, E);

        // Print previous runs as an HTML table
        section.append(this.table(this.xname_, "E"));
    }
}

//*****************************************************************************

// A closure to handle R optimization

let Ropt = (function() {

    // Private data from previous runs
    let runs = new PreviousRuns("#Ropt", "R", (alpha, R) => [alpha, R]);

    // Function that handles R optimization
    return function() { runs.handler(); };

}());

//*****************************************************************************

// A closure to handle alpha optimization

let Aopt = (function() {

    // Private data from previous runs
    let runs = new PreviousRuns("#Aopt", "&xi;", (alpha, R) => [R, alpha]);

    // Function that handles alpha optimization
    return function() { runs.handler(); };

}());

//*****************************************************************************

// Initialize navegation bar and sections
setNavSections();

// Add event listener for `E/R' table
document.querySelector("#EvsR-button").addEventListener("click",
                                                        (e) => { EvsR(); } );

// Add event listener for `R' optimization
document.querySelector("#Ropt-button").
    addEventListener("click", (e) => { Ropt(); });

// Add event listener for `alpha' optimization
document.querySelector("#Aopt-button").
    addEventListener("click", (e) => { Aopt(); });

// Loop over all items in the navegation bar, adding event listeners
for (let item of document.querySelectorAll("body > nav > ul > li"))
    item.addEventListener("click", (e) => { setNavSections(item); });

// Initialize navegation bar and sections
// setNavSections();

// Prevent the use of the ENTER key in `input' elements
for (let input of document.querySelectorAll("input"))
    input.addEventListener("keydown", (e) =>
                           { if (e.keyCode == 13) e.preventDefault(); });
