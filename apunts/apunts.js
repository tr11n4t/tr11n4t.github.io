/*********************************************************************
* JavaScript file for job `apunts'
*********************************************************************/
"use strict";

/*-----------------------------------------------------------------------------
  'settings' library
-----------------------------------------------------------------------------*/

// This library provides the necessary code for handling the settings of a web
// page.  Examples of settings could be the text size, background and
// foreground colors, ...

// For each setting, the web page should contain a set of 'radio buttons' that
// act as a frontend to the JavaScript code underneath.  The HTML code for
// this frontend should be structured as in this example:
//
//   <fieldset id="SettingID">
//     <legend>Setting Description</legend>
//     <label>
//       <input type="radio" name="SettingID" value="value1">
//       <span>Value 1</span>
//     </label>
//     <label>
//       <input type="radio" name="SettingID" value="value2 checked>
//       <span>Value 2</span>
//     </label>
//       ...
//   </fieldset>
//
// The code is contained in namespace 'sttngs$', with the following
// public members:
//
//   -- Class 'sttngs$.Setting', for storing the state of a setting.
//   -- Helper 'sttngs$.updateFrontend()' updates the HTML frontend
//   -- Helper 'sttngs$.addHandler()' adds a handler to the HTML frontend
//   -- Helper 'sttngs$.editAtags() edits the (relative) <a> tags to reflect
//      the setting state
//   -- Helper 'sttngs$.onchangeSetting()' is a handler for change events in
//      the HTML frontend.

// Namespace `sttngs$'.  Members should be invoked as 'sttngs$.member'
let sttngs$ = (function() {

    //.........................................................................
    // Private members of namespace
    //.........................................................................

    // Class implementing a toggle switch (the implementation is private, but
    // public access will be granted later)
    class Setting {

        // Constructor.
        // The current state is obtained from a search parameter in the URL.
        // - 'id' is the 'id' attribute of the HTML '<fieldset>' element
        //   acting as a frontend (see example above).  It is also used for
        //   the name of the search parameter in the URL and for the 'name'
        //   attribute of the '<input>' elements implementing the radio
        //   buttons.
        constructor(id) {

            // Save the ID and the default state
            this.id_ = id;

            // Set 'this.def_' to the last resort default state.
            // The default state will be used when the state is not specified
            // in the URL.
            {
                // First, we set 'this.def_' to the "folded" state
                this.def_ = "folded";

                // Next, we try to get the default state from the HTML frontend
                let fe = document.getElementById(this.id_);
                if (fe) {
                    let ins = fe.getElementsByTagName("input");
                    for (let i of ins)
                        if (i.checked) this.def_ = i.value;
                }
            }

            // Set the state from URL
            const sp = new URL(window.location).searchParams.get(this.id_);
            this.state_ = (sp) ? sp : this.def_;

            // Update the HTML frontend
            sttngs$.updateFrontend(this);

            // Edit the (relative) <a> tags in the document
            sttngs$.editAtags(this);
        }
    }

    //.........................................................................
    // Public members of namespace
    //.........................................................................

    return {

        // Grant access to the 'Setting' class
        Setting: Setting,

        // Update the HTML frontend
        updateFrontend: function(setting) {
            let fe = document.getElementById(setting.id_);
            if (fe) {
                let ins = fe.getElementsByTagName("input");
                for (let i of ins)
                    i.checked = (i.value == setting.state_) ? true : false;
            }
        },

        // Method that adds a handler for change events on the HTML frontend
        addHandler: function(setting, handler) {
            let fe = document.getElementById(setting.id_);
            if (fe) fe.addEventListener("change", handler, false);
        },

        // Edit <a> tags to include the setting state, as a search parameter,
        // in their 'href' attribute.  Only relative tags will be dealt with.
        editAtags: function(setting) {
            let atags = document.getElementsByTagName("a");
            for (let atag of atags) {

                // Only relative URLs will be changed
                if (new URL(document.baseURI).origin ==
                    new URL(atag.href, document.baseURI).origin) {

                    // This is a relative URL
                    let url = new URL(atag.href);

                    // Set the parameter or remove it, according to the ID
                    if (setting.state_ == setting.def_)
                        url.searchParams.delete(setting.id_);
                    else
                        url.searchParams.set(setting.id_, setting.state_);

                    // Set the 'href' attribute in the <a>
                    atag.href = url.toString();
                }
            }
        },

        // Handler for a 'change' event on the HTML frontend
        onchangeSetting: function(event) {

            // Prevent default behavior and bubbling up
            event.preventDefault();
            event.stopPropagation();

            // Set the state from the 'value' attributes of the HTML frontend
            let ins = event.currentTarget.getElementsByTagName("input");
            for (let i of ins) {
                if (i.checked) {
                    this.state_ = i.value;
                    break;
                }
            }

            // Edit <a> tags to reflect change in state
            sttngs$.editAtags(this);
        }
    };
})();

/*-----------------------------------------------------------------------------
  `unfolder' library
-----------------------------------------------------------------------------*/

// This library provides the necessary code for unfolding/folding the content
// of certaing elements in the document tree.  All the code is contained in
// namespace 'ufld$'.  To use it, just invoke the initialization function as
// follows:
//               ufld$.init(clsname, IDprefix);
// where
// -- 'clsname' is the class to which all the foldable elements should belong
// -- 'IDprefix' is the prefix used for the 'id' attributes of all foldable
// elements, attributes that the 'init' function will add automatically. Care
// must be taken when choosing 'IDprefix', to ensure uniqueness of 'id'
// attributes.  If no provided, it defaults to "fld::".
//
// The foldable elements, in addition to belonging to class 'clsname', should
// containg two and only two children.  The first one is a summary of the
// content.  The second one holds the content, which will be folded unless the
// parent belong to the class 'unfolded'

// Tipically, foldable elements and their first child are respectively
// 'details' and 'summary' HTML5 elements, although the current code
// will work with other choices

// Namespace `ufld', invoked as `ufld$.method(...)'
let ufld$ = (function() {

    //................................................................
    // Private members of namespace
    //................................................................

    // Class name of foldable element
    let FOLDABLE;

    // Prefix used for the 'id' attribute of foldable elements
    let IDPREFIX;

    // ID of the fold/unfold toggle switch
    let SWITCHID;

    // State class for foldable elements
    class FoldState {

        // Constructor
        constructor() {

            // Check if 'history' contains a valid state
            if (history.state) {

                // Valid state.  Use it to initialize the fold state
                for (let key of Object.keys(history.state))
                    this[key] = history.state[key];

                // Update the fold/unfold toggle switch frontend
                sttngs$.updateFrontend(this.switch_);

                // Edit <a> tags to reflect current toggle switch state
                sttngs$.editAtags(this.switch_);

            } else {

                // No valid state in history.  Fresh fold state

                // Array with the IDs of unfolded foldables
                this.unfolded_ = [];

                // Foldable having the focus
                this.focus_ = undefined;

                // Initialize the fold/unfold toggle switch
                this.switch_ = new sttngs$.Setting(SWITCHID);

                // If the URL has a hash, do the following: see if
                // there is an element with ID equal to hash, and if
                // there is, travel up the tree while unfolding
                // elements and setting the focus on the first
                // foldable ancestor
                let hash = window.location.hash.substring(1);
                if (hash) {

                    let e = document.getElementById(hash);
                    let focusflag = false;
                    while (e) {

                        // If the current element is a foldable, unfold it
                        if (e.classList.contains(FOLDABLE))
                            this.unfolded_.push(e.id);

                        // Check if the element is foldable and the
                        // focus flag is still false.  If so, focus
                        // the element and set the focus flag to
                        // prevent focusing on up-the-tree ancestors
                        if (focusflag==false && e.classList.contains(FOLDABLE))
                        {
                            this.focus_ = e.id;
                            focusflag = true;
                        }

                        // Prepare for the next ancestor's level
                        e = e.parentElement;
                    }
                }
            }

            // Add handler for change events on the fold/unfold toggle switch
            sttngs$.addHandler(this.switch_, onchangeSwitch.bind(this));
        }

        // Add ID attributes to all foldables
        static identify() {

            // Function used to traverse the tree down from 'e' while adding
            // ID attributes to foldables
            function traverse(e, s, cntr) {
                let kids = e.children;
                for (let i=0; i<kids.length; ++i) {

                    // Check for foldable kids
                    if (kids[i].classList.contains(FOLDABLE)) {

                        // Add ID
                        kids[i].id = s + "." + (++cntr);

                        // Recurse
                        if (kids[i].children.length > 0)
                            traverse(kids[i].children[1], s + "." + cntr, 0);
                    }
                    else
                        traverse(kids[i], s , cntr); // Unfoldable.  Recurse
                }
            }

            // Traverse the tree from the 'body' element down
            traverse(document.getElementsByTagName("body")[0], IDPREFIX, 0);
        }

        // Update the fold state from the focused and unfolded foldables
        update() {

            // Get the focused foldable, if any, and update focus state
            let fcs = document.getElementsByClassName(`${FOLDABLE} focus`)[0];
            this.focus_ = (fcs) ? fcs.id : undefined;

            // Update unfolded foldables
            if (this.switch_.state_ == "unfolded") {

                // Toggle switch in "unfolded" state.  Unfold everything
                const ufld =
                      document.getElementsByClassName(`${FOLDABLE} unfolded`);
                this.unfolded_ = [...ufld].map(e => e.id);

            } else {

                // Toggle switch in "folded" state.  Fold everything
                this.unfolded_ = [];

                // Unfold focused foldable and its foldable ancestors
                while (fcs) {

                    // If the current element is a foldable, unfold it
                    if (fcs.classList.contains(FOLDABLE))
                        this.unfolded_.push(fcs.id);

                    // Prepare for the next ancestor's level
                    fcs = fcs.parentElement;
                }
            }
        }

        // Render the page according to the fold state
        render() {

            // Traverse all foldables, folding them and setting their content
            // "overflow" to 'hidden'
            const fld = document.getElementsByClassName(FOLDABLE);
            for (let e of fld)
            {
                if (this.switch_.state_ == "folded") {
                    e.classList.remove("unfolded");
                    e.lastElementChild.style.overflow = 'hidden';
                } else {
                    e.classList.add("unfolded");
                }
            }

            // Unfold the required foldables while making their upstream
            // content overflow visible (so that 'sticky' will work)
            for (let id of this.unfolded_)
            {
                // Fold
                let e = document.getElementById(id);
                e.classList.add("unfolded");

                // Make upstream content visible
                let upContent = e.parentElement;
                if (upContent.parentElement.classList.contains("foldable"))
                    upContent.style.overflow = 'visible';
            }

            // Remove a possible focus from a foldable
            let e = document.getElementsByClassName(`${FOLDABLE} focus`)[0];
            if (e) e.classList.remove("focus");

            // Set focus and scroll summary into view if necessary
            if (this.focus_)
            {
                let e = document.getElementById(this.focus_);
                e.classList.add("focus");
                intoView(e.firstElementChild);
            }
        }
    }

    // Variable containing the folded state
    let foldstate;

    // Scroll element 'e' into view if necessary
    function intoView(e) {

        // Get the rectangle that bounds the element
        const rect = e.getBoundingClientRect();

        // Scroll if necessary
        if (rect.top < 0 || rect.top > window.innerHeight) e.scrollIntoView();
    }

    // Handler for 'click' events on <a> tags linking to other pages
    function onclickHandlerOther(event) {

        // Prevent clicks on links from bubbling up
        event.stopPropagation();

        // Holding down the CRTL key while left clicking will open the page in
        // a new tab.  It work in all major browsers.  See
        //            https://www.howtogeek.com/114518
        // If the link was clicked without holding down CRTL, replace the
        // current history entry with the current state, then load the link
        if (!event.ctrlKey) {

            // Replace the current history entry
            history.replaceState(foldstate, "");

            // Assign the new URL
            window.location.assign(event.currentTarget.href);

            // If the previous assignment was successful, reload
            if (event.currentTarget.href === window.location.href)
                window.location.reload();
        }
    }

    // Handler for 'click' events on <a> tags linking to current page
    function onclickHandlerSame(event) {

        // Prevent clicks on links from bubbling up
        event.stopPropagation();

        // Holding down the CRTL key while left clicking will open the page in
        // a new tab.  It work in all major browsers.  See
        //            https://www.howtogeek.com/114518
        // If the link was clicked without holding down CRTL, replace the
        // current history entry with the current state, then load the link
        if (!event.ctrlKey) {

            // Replace the current history entry
            history.replaceState(foldstate, "");

            // Assign the new URL
            window.location.assign(event.currentTarget.href);
        }
    }

    // Handler for 'click' on the toggle switch element
    function onchangeSwitch(event) {

        // Invoke the handler from the 'sttngs$' namespace
        sttngs$.onchangeSetting.bind(this.switch_)(event);

        // Update the fold state from the focused and unfolded foldables
        this.update();

        // Invoke the renderizer to re-render the page
        this.render();
    }

    // Handler for 'popstate' events (for instance, clicking the back button)
    function popstateHandler(event) {

        // Reset the fold state
        foldstate = new FoldState();

        // Initialize the fold state from the previous entry in the history,
        // which is contained in 'event.state'
        if (event.state) {
            for (let key of Object.keys(event.state))
                foldstate[key] = event.state[key];
        }

        // Render the page from the fold state
        foldstate.render();
    }

    // Function that returns a button element containing a fold/unfold icon
    function foldIcon() {
        const XML = "http://www.w3.org/2000/svg"; // XML namespace

        // Create a SVG element containing + and - signs ...
        let svg = document.createElementNS(XML, "svg");
        svg.setAttribute("viewBox", "0 0 200 200");
        // ... hozirontal line (both + and - signs)
        let hline = document.createElementNS(XML, "line");
        hline.setAttribute("x1", "35");
        hline.setAttribute("y1", "100");
        hline.setAttribute("x2", "165");
        hline.setAttribute("y2", "100");
        hline.classList.add("folded", "unfolded");
        svg.append(hline);
        // ... vertical line (only + sign)
        let vline = document.createElementNS(XML, "line");
        vline.setAttribute("x1", "100");
        vline.setAttribute("y1", "35");
        vline.setAttribute("x2", "100");
        vline.setAttribute("y2", "165");
        vline.classList.add("folded");
        svg.append(vline);

        // Create a 'button' element containing the previous SVG image
        let icon = document.createElement("button");
        icon.append(svg);
        icon.title = "Click to fold/unfold";
        icon.type = "button";

        return icon;
    }

    // Function used to initialize foldable 'el'
    function initFoldable(el) {

        // Handler for 'click' events on foldables
        function unfoldHandler(event) {

            // Prevent default behaviour of 'summary' elements
            event.preventDefault();

            // Prevent the event from bubbling up the tree
            event.stopPropagation();

            // Unfocus all the elements
            let els = document.getElementsByClassName("focus")
            for (let e of els) e.classList.remove("focus");

            // Focus the calling element
            event.currentTarget.classList.add("focus");

            // Allow animations in the calling element
            event.currentTarget.classList.remove("notransition");

            // Get the child containing the content, and return if no content
            let content = event.currentTarget.lastElementChild;
            if (!content) return;

            // Set the inline "height" property of the content element
            content.style.height = content.scrollHeight + 'px';

            // Toggle folded status
            event.currentTarget.classList.toggle("unfolded");

            // Update folded state
            foldstate.update();

            // Set the hash of the URL
            history.replaceState(null, null, window.location.pathname +
                                 "#" + event.currentTarget.id);

            // The inline "height" property set above should be removed at the
            // end of the animation.  This is done differently when folding
            // or when unfolding.  See this thread:
            //          https://stackoverflow.com/questions/3508605
            if (event.currentTarget.classList.contains("unfolded")) {
                // Unfolding.  Listening to a 'transitionend' event

                // Add handler, which will run just once
                content.addEventListener('transitionend', (e) => {
                    e.currentTarget.style.removeProperty('height');
                }, {
                    once: true
                });

                // Make upstream content visible, or 'sticky' will not work
                let upContent = content.parentElement.parentElement;
                if (upContent.parentElement.classList.contains("foldable"))
                    upContent.style.overflow = 'visible';

            } else {
                // Folding.  Using 'setTimeout'

                // Set the "height" and "overflow" of the content element
                content.style.height = content.scrollHeight + 'px';
                content.style.overflow = 'hidden';

                // Set "height" and "overflow" of nested content elements
                let els = content.getElementsByClassName(FOLDABLE);
                for (let e of els) {
                    let nc = e.lastElementChild; // Nested content element
                    if (nc)
                        nc.style.height = (e.classList.contains("unfolded")) ?
                        nc.scrollHeight + 'px' : '0px';
                    nc.style.overflow = 'hidden';
                }

                // Some delay needed for the previous actions to complete
                const DELAY = '10';  // Delay (in ms)

                // Use 'setTimeout' to remove the inline "height" property
                // after the next event loop cycle
                window.setTimeout(() => {

                    // Remove inline 'height' from current content element
                    content.style.removeProperty('height');

                    // Remove inline 'height' from nested content elements
                    // Also, fold unfolded elements
                    let els = content.getElementsByClassName(FOLDABLE);
                    for (let e of els) {
                        let nc = e.lastElementChild; // Nested content element
                        if (nc) nc.style.removeProperty('height');
                        e.classList.remove("unfolded");
                    }

                    // Scroll the summary into view if necessary
                    intoView(content.previousElementSibling);
                }, DELAY);
            }

        }

        //. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
        // Main body of `initFoldable(el)
        //. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

        // No transitions when first loading
        el.classList.add("notransition");

        // Unfold the target element `el'
        el.classList.remove("unfolded");

        // If the foldable has no content, mark it as 'empty'.  If it has,
        // add a fold/unfold button
        if (el.lastElementChild.childElementCount == 0)
            el.classList.add("empty");
        else
            el.firstElementChild.append(foldIcon());

        // Register handler for the target element
        el.addEventListener("click", unfoldHandler, false);
    }

    //.........................................................................
    // Public members of namespace
    //.........................................................................

    return {

        // Initialize the document tree (see above how to invoke it)
        init : function(clsname, IDprefix) {

            // Set a missing 'IDprefix' argument to its default value
            if (IDprefix === undefined) IDprefix = "fld";

            // Initialize the class name of foldable elements
            FOLDABLE = clsname;

            // Initialize the 'id' attribute prefix
            IDPREFIX = IDprefix;

            // Initialize the ID of the fold/unfold toggle switch
            SWITCHID = "foldSetting";

            // Set the ID attribute of all foldable elements
            FoldState.identify();

            // Initialize the fold state
            foldstate = new FoldState();

            // Listen for clicks on links (<a> tags)
            let atags = document.getElementsByTagName("a");
            let currentPrehash = window.location.href.split("#")[0];
            for (let atag of atags) {
                if (currentPrehash === atag.href.split("#")[0])
                    // Link to the current page
                    atag.addEventListener("click", onclickHandlerSame, false);
                else
                    // Link to another page
                    atag.addEventListener("click", onclickHandlerOther, false);
            }

            // Listen for 'popstate' events (say, clicking the back button)
            window.addEventListener('popstate', popstateHandler, false);

            // Traverse the tree while initializing all foldables
            let els = document.getElementsByClassName(FOLDABLE);
            for (let e of els) initFoldable(e);

            // Render the page
            foldstate.render();

        },
    };
})();

/*--------------------------------------------------------------------
  Content added by ‘qq-prop’ package
--------------------------------------------------------------------*/

// Activate folding/unfolding of "foldable" elements
ufld$.init("foldable", "pnt");
