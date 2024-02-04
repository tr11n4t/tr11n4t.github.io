/*
  This module provides some tools for the analysis of atomic densities
obtained from the Clementi-Roetti tables.

  Radial orbitals are expressed as linear combinations of normalized basis
functions,
       R_n(r) = \sum_{i=1}^N c_i
      \frac{(2\alpha)^{n+\frac{1}{2}}}{[(2n)!]^{\frac{1}{2}}}
      r^{n-1} e^{-\alpha_i r}

  The following functions/classes will exported
   * Class `SubShell', for handling an atomic subshell
   * Function `nl2symbol', to get a subshell's symbol for `n' and `l'
   * Function `symbol2nl', to get `n' and `l' from a subshell's symbol
   * Class `AtomRho', for handling atomic densities
*/

//*****************************************************************************

//  Class `SubShell' can be used to handle an atomic subshell

class SubShell {

    // Public fields

    // -- `ne' is the number of electrons in the shell
    // -- `n' and `l' are the shell's quantum numbers
    // -- `bfnts' is an array containing the basis functions in the format
    //                 [ ..., [n_i, l_i, alpha_i], ... ]
    // -- `coes' is an array containing the basis functions' coefficients
    // -- `q' contains the subshell's total charge
    // -- `radius' is the subshell's average radius

    //-------------------------------------------------------------------------

    // Private fields

    // -- `rho_' contains a representation of the radial density expressed as
    //    a lineal combination of basis functions in the format
    //                 [ ..., [c_i, n_i, alpha_i], ... ]
    //    The basis functions used are `r^n exp(-alpha)'


    //-------------------------------------------------------------------------

    // Constructor
    // -- `ne' is the number of electrons in the subshell
    // -- `n' and `l' are the subshell's quantum numbers
    // -- `bfnts' is an array containing the basis functions in the format
    //                 [ ..., [n_i, l_i, alpha_i], ... ]
    // -- `coes' is an array containing the basis functions' coefficients
    // Nothing is constructed if no arguments are provided

    constructor(ne=null, n, l, bfnts, coes) {

        // Do nothing if constructor is invoked with no arguments
        if (ne === null) return;

        // Set public fields
        this.ne = ne;
        this.n = n;
        this.l = l;
        this.bfnts = [];
        for (let bfnt of bfnts) this.bfnts.push(Array.from(bfnt));
        this.coes = Array.from(coes);

        // Include normalization constant in coefficients
        for (let i=0; i<this.coes.length; ++i) {
            let a2 = this.bfnts[i][2]; a2 += a2;
            let n = this.bfnts[i][0];
            let n2 = n + n;
            let c = 1;
            let d = a2;
            for (let j=0; j<n; ++j) {
                c *= a2;
                d /= (n2*(n2-1));
                n2 -= 2;
            }
            this.coes[i] *= c*Math.sqrt(d);
        }

        // Represent the density as lineal combination of basis functions
        this.rho_ = [];
        for (let i=0; i<this.coes.length; ++i) {

            // Diagonal element
            let ci = this.coes[i];
            let ai = this.bfnts[i][2];
            let ni = this.bfnts[i][0];
            this.rho_.push([ci*ci*this.ne, ni+ni, ai+ai]);

            // Off-diagonal elements
            for (let j=i+1; j<this.coes.length; ++j) {
                let cj = this.coes[j]*this.ne;
                let aj = this.bfnts[j][2];
                let nj = this.bfnts[j][0];
                this.rho_.push([2*ci*cj, ni+nj, ai+aj]);
            }
        }

        // Set the subshell's total charge and average radius
        this.q = this.radius = 0;
        for (let i=0; i<this.rho_.length; ++i) {

            // Integrate the current basis function
            let n = this.rho_[i][1];
            let inva = 1/this.rho_[i][2];
            let tmp = inva;
            for (let j=1; j<=n; ++j) tmp *= j*inva;

            // Accumulate results
            this.q += this.rho_[i][0]*tmp;
            this.radius += this.rho_[i][0]*tmp*inva*(n+1);
        }
        this.radius /= this.q;
    }

    //-------------------------------------------------------------------------

    // Clone a `SubShell' object.
    // -- `copy' is the object where the current instance is copied to.

    clone(copy=new SubShell()) {

        // Copy primitive public fields
        copy.ne = this.ne;
        copy.n = this.n;
        copy.l = this.l;
        copy.q = this.q;
        copy.radius = this.radius;

        // Deep copy of coefficients
        copy.coes = Array.from(this.coes);

        // Deep copy of basis functions
        copy.bfnts = [];
        for (let bfnt of this.bfnts) copy.bfnts.push(Array.from(bfnt));

        // Deep copy of private representation of density
        copy.rho_ = [];
        for (let rfnt of this.rho_) copy.rho_.push(Array.from(rfnt));

        // Return the cloned object
        return copy;
    }

    //-------------------------------------------------------------------------

    // Return the value of the radial orbital at `r'

    orb(r) {

        // Loop over basis functions
        let res = 0;
        for (let i=0; i<this.coes.length; ++i) {
            let a = this.bfnts[i][2];
            let n = this.bfnts[i][0];
            let rn = 1;
            for (let j=1; j<n; ++j) rn *= r;
            res += this.coes[i]*rn*Math.exp(-a*r);
        }

        // Return result
        return res;
    }

    //-------------------------------------------------------------------------

    // Return the value of the radial density at `r'

    rho(r) {
        let res = r * this.orb(r);
        return this.ne*res*res;

    }

    //-------------------------------------------------------------------------

    // Return the subshell's charge contained in the interval `[0,r]'

    qr(r) {

        // Loop over basis functions
        let res = 0;
        for (let i=0; i<this.rho_.length; ++i) {

            // Integrate the current basis function
            let n = this.rho_[i][1];
            let inva = 1/this.rho_[i][2];
            let ear = Math.exp(-this.rho_[i][2]*r);
            let tmp = (1-ear)*inva;
            let rn = 1;
            for (let j=1; j<=n; ++j) tmp = (j*tmp - (rn *= r)*ear)*inva;

            // Accumulate result
            res += this.rho_[i][0]*tmp;
        }

        // Return result
        return res;
    }
}

//*****************************************************************************

// Return the subshell's symbol from the quantum numbers `n' and `l'

function nl2symbol(n, l) {
    const lsymbol = ["s", "p", "d", "f", "g", "h", "i", "k"];
    return n.toString() + lsymbol[l];
}

//-----------------------------------------------------------------------------

// Return the quantum numbers `n' and `l' from the subshell's symbol
// The quantum numbers are returned inside a lenght-two array

function symbol2nl(sym) {
    const lsymbol = ["s", "p", "d", "f", "g", "h", "i", "k"];
    return [parseInt(sym.charAt(0)), lsymbol.indexOf(sym.charAt(1))];
}

//*****************************************************************************

//  Class `AtomRho' can be used to handle atomic densities

class AtomRho {

    // Public fields

    // -- `css' is an array containing the core subshells
    // -- `vss' is an array containing the valence subshells
    // -- Number of electrons: `ane' (atom), `cne' (core),  `vne' (valence)
    // -- Total charge: `aq' (atom), `cq' (core),  `vq' (valence)
    // -- Average radius: `aradius' (atom), `cradius' (core),  `vradius'
    //    (valence)

    //-------------------------------------------------------------------------

    // Constructor
    // -- `css' is an array containing the core subshells
    // -- `vss' is an array containing the valence subshells
    // Nothing is constructed if no arguments are provided

    constructor(css=null, vss) {

        // Do nothing if constructor is invoked with no arguments
        if (css === null) return;

        // Deep copy core subshells
        this.css = [];
        for (let i=0; i<css.length; ++i) this.css.push(css[i].clone());

        // Deep copy valence subshells
        this.vss = [];
        for (let i=0; i<vss.length; ++i) this.vss.push(vss[i].clone());

        // Set number of electrons
        this.cne = this.css.reduce((s,ai) => s+ai.ne, 0);
        this.vne = this.vss.reduce((s,ai) => s+ai.ne, 0);
        this.ane = this.cne + this.vne;

        // Set total charge
        this.cq = this.css.reduce((s,ai) => s+ai.q, 0);
        this.vq = this.vss.reduce((s,ai) => s+ai.q, 0);
        this.aq = this.cq + this.vq;

        // Set average radius
        this.cradius = this.css.reduce((s,ai) => s+ai.q*ai.radius, 0);
        this.vradius = this.vss.reduce((s,ai) => s+ai.q*ai.radius, 0);
        this.aradius = (this.aq == 0) ? 0 :
            (this.cradius + this.vradius) / this.aq;
        this.cradius = (this.cq == 0) ? 0 : this.cradius/this.cq;
        this.vradius = (this.vq == 0) ? 0 : this.vradius/this.vq;
    }

    //-------------------------------------------------------------------------

    // Return the core density at `r'
    crho(r) {
        return this.css.reduce((s,ai) => s+ai.rho(r), 0);
    }

    // Return the valence density at `r'
    vrho(r) {
        return this.vss.reduce((s,ai) => s+ai.rho(r), 0);
    }

    // Return the total atomic density at `r'
    arho(r) {
        return this.crho(r) + this.vrho(r);
    }

    //-------------------------------------------------------------------------

    // Return core charge contained in the interval `[0,r]'
    cqr(r) {
        return this.css.reduce((s,ai) => s+ai.qr(r), 0);
    }

    // Return valence charge contained in the interval `[0,r]'
    vqr(r) {
        return this.vss.reduce((s,ai) => s+ai.qr(r), 0);
    }

    // Return the atomic charge contained in the interval `[0,r]'
    aqr(r) {
        return this.cqr(r) + this.vqr(r);
    }
}
