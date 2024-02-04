/*
  This module provides the utilities necessary to apply the Restricted
  Hartree-Fock (RHF), Valence Bond (VB), and Coulson-Fischer (CF)
  methods to the hydrogen molecule.

  Only two basis functions are used:
    a = \sqrt(alpha^3/PI) \exp(-alpha r_a)
    b = \sqrt(alpha^3/PI) \exp(-alpha r_b)

  which are normalized 1s Slater-type orbitals respectively centered
  on each of the two hydrogen nuclei.

  The following classes will exported
   * Class `H2ints', for computing the molecular integrals
   * Class `H2qchem', for computing the RHF, VB, and CF methods
*/

//*****************************************************************************

// Auxiliary function to compute `(exp(x)-1)/x', to avoid problems at
// small `x'
// -- `expx' is `exp(x)'
// -- `invx' is `1/x'

function mu(x, expx, invx) {
    const TAU = 0.1;
    const EPS = Number.EPSILON;
    if (Math.abs(x) > TAU)
        return (expx - 1)*invx;
    else {
        let res = 1;
        let x0 = 1;
        let i = 1;
        while (Math.abs(x0) > EPS) res += (x0 *= x/++i);
        return res;
    }
}

//*****************************************************************************

// Auxiliary function `beta' related to the exponential integral `Ei'
// in the follwoing way:
//     Ei(-x) = C + ln x - x beta(x),
// where `C' is Euler's constant.

// This function should only be used for small values of `x', `x <= 2'

function beta(x) {
    const EPS = Number.EPSILON;

    //---------------------------------------------------------------------
    // The result will be computed by means of the series
    //      \sum_{i=1} (-x)^(i-1)/(i*i!)
    // (see, for instance, Numerical Recipes)
    //---------------------------------------------------------------------

    // Initialize
    let x2 = x*x;
    let xn = 1;
    let jn = 1;
    let j = 1;
    let res = 0;
    let a;

    // Loop until convergence
    do {

        // Update result
        a = xn*(1/j - x/((j+1)*(j+1)))/jn;
        res += a;

        // Prepare for next loop
        xn *= x2;
        j += 2;
        jn *= j*(j-1);

    } while (Math.abs(a) > EPS);

    // Return result
    return res;
}

//*****************************************************************************

// Auxiliary function `nu' related to the exponential integral `Ei'
// in the follwoing way:
//     Ei(-x) = -exp(-x) nu(x)

// This function should only be used for large values of `x', `x > 2'

function nu(x) {
    const EPS = Number.EPSILON;
    const EPS2 = EPS*EPS;

    //---------------------------------------------------------------------
    // Evaluate as a continued fraction, using the modified
    // Lentz's algorithm described in `Numerical Recipes'.
    // The continued fraction is
    //                          a1    a2
    //                    b0 + ----  ----  ...
    //                         b1 +  b2 +
    // with
    //   b0=0, b1=x+1, bn=b_{n-1}+2, n>1
    //   a1=1, a2=-1, an=a_{n-1}-2n+3, n>2
    // See:
    //   https://functions.wolfram.com/GammaBetaErf/ExpIntegralE/10/
    //---------------------------------------------------------------------

    // Initialize
    let Delta;
    let Cj = 1/EPS2;
    let Dj = 1/(x+1);
    let res = Dj;
    let aj = -1;
    let bj = x + 3;
    let j = 2;

    // Loop until convergence
    do {

        // Update result
        Dj = bj + aj*Dj;
        Dj = (Dj == 0) ? EPS2 : Dj;
        Cj = bj + aj/Cj;
        Cj = (Cj == 0) ? EPS2 : Cj;
        Dj = 1/Dj;
        Delta = Cj*Dj;
        res *= Delta;

        // Prepare for next loop
        ++j;
        aj += (3-2*j);
        bj += 2;

    } while(Math.abs(Delta-1) > EPS);

    return res;
}

//*****************************************************************************

// Auxiliary function to compute `Q' (required by integral `aabb'), to
// avoid problems at small `x'
// -- `expx' is `exp(-x)'

function Q(x, expx) {
    const C = 0.577215664901532860606512090082402431042;
    const TAU = 1/2;
    const EPS = Number.EPSILON;
    let x2 = x*x;

    // The approach followed to compute `Q' depends on the magnitude of `x',
    // with the constant `TAU' used to decide what is small and large
    if (x <= TAU) {

        //---------------------------------------------------------------------
        // Small values of `x', `x <= TAU'
        //---------------------------------------------------------------------

        // For `x = 0', the function's value is zero
        if (x == 0) return 0;

        // Compute `T/x'
        let Tx = 0;
        {
            // Initialize
            let x2i = 1;
            let i = 0;
            let ifact = 120;
            let Tx0 = 0;

            // Loop until convergence
            do {
                // Compute contribution and accumulate
                Tx0 = (i+2)*(i+1)*x2i/ifact;
                Tx += Tx0;

                // Prepare for next loop
                x2i *= x2;
                ++i;
                ifact *= (i+i+5)*(i+i+4);
            } while (Math.abs(Tx0) > EPS);

            // Set `Tx'
            Tx *= 8*x2*x2/3;
        }

        // Compute overlap-like integrals
        let S = expx*(1+x+x2/3);
        let Sp = (1-x+x2/3)/expx;

        // Compute result
        let res = (x*Tx*(C+Math.log(x)) + Sp*Math.log(4))*Tx
        res -= 4*Sp*(Sp*beta(4*x)-S*beta(2*x));

        // Return result
        return res;

    } else {

        //---------------------------------------------------------------------
        // Large values of `x', `x > TAU'
        //---------------------------------------------------------------------

        // Compute overlap-like integral (without exponential)
        let S = (1+x+x2/3);
        let Sp = (1-x+x2/3);

        // Compute result
        let res = S*S*(C+Math.log(x)) - Sp*Sp*nu(4*x) + 2*S*Sp*nu(2*x);
        res *= expx*expx/x;

        // Return result
        return res;
    }
}

//*****************************************************************************

/*
  Class `H2ints', which computes the relevant integrals for a given
  internuclear distance `R' and exponential parameter `alpha'.

  The expression for the integrals has been taken from
       John C. Slater, `Quantum Theory of Matter', Second edition,
       McGraw-Hill, New York, 1968
  (table 21.1 in page 417)
*/

class H2ints {
    // Fields to store the integrals
    // `R' is the internuclear distance
    // `alpha' is the exponential parameter
    // `ab' is `<a|b>' (overlap)
    // `aTa' is `<a|T|a>', with `T=-(1/2) nabla^2' (kinetic energy)
    // `aTb' is `<a|T|b>', with `T=-(1/2) nabla^2' (kinetic energy)
    // `aNaa' is `<a|Na|a>', with `Na=-1/ra' (nuclear attraction)
    // `aNba' is `<a|Nb|a>', with `Nb=-1/rb' (nuclear attraction)
    // `aNbb' is `<a|Nb|b>', with `Nb=-1/rb' (nuclear attraction)
    // `aaaa' is `<aa|1/r12|aa>' (electron repulsion, 5*alpha/8)
    // `abab' is `<ab|1/r12|ab>' (electron repulsion, J)
    // `aaab' is `<aa|1/r12|ab>' (electron repulsion, L)
    // `aabb' is `<aa|1/r12|bb>' (electron repulsion, K)

    // Constructor
    // -- `R' is the internuclear distance
    // -- `alpha' is the exponential parameter

    constructor(R, alpha) {
        const HALF = 1/2;
        const THIRD = 1/3;
        const FOURTH = HALF*HALF;
        let alpha2 = alpha*alpha;
        let w = R*alpha;
        let w2 = w*w;
        let w3 = w2*w;
        let invw = 1/w;
        let inv2w = 1/(2*w);
        let inv3w = 1/(3*w);
        let ew = Math.exp(-w);
        let ew2 = ew*ew;
        let ew3 = ew2*ew;

        // Set `R' and `alpha'
        this.R = R;
        this.alpha = alpha;

        // Set `<a|b>'
        this.ab = ew * (1+w+w2*THIRD);

        // Set `<a|T|a>', with `T=-(1/2) nabla^2'
        this.aTa = alpha2*HALF;

        // Set `<a|T|b>', with `T=-(1/2) nabla^2'
        this.aTb = alpha2*ew*(1+w-w2*THIRD)*HALF;

        // Set `<a|Na|a>', with `Na=-1/ra'
        this.aNaa = -alpha;

        // Set `<a|Nb|a>', with `Nb=-1/rb'
        this.aNba = alpha * (-2 *mu(-2*w, ew2, -inv2w) + ew2);

        // Set `<a|Nb|b>', with `Nb=-1/rb'
        this.aNbb = -alpha * ew * (1+w);

        // Set `<aa|r12|aa>'
        this.aaaa = (5*alpha)/8;

        // Set `<ab|r12|ab>'
        this.abab = alpha * (2*mu(-2*w, ew2, -inv2w) - ew2*
                             (11*FOURTH + 3*w*HALF + w2*THIRD)*HALF);

        // Set `<aa|r12|ab>'
        this.aaab = (alpha/8) *
            (5*(3*mu(-3*w, ew3, -inv3w) - mu(-w, ew, -invw))/2
             + ew*(8*w+1) - ew3);

        // Set `<aa|r12|bb>'
        this.aabb = -ew2 * (-25/8 + 23*w*FOURTH + 3*w2 + w3*THIRD) + 6*Q(w,ew);
        this.aabb *= alpha/5;
    }
}

//*****************************************************************************

//  Class `H2qchem', which computes the MO, VB, and CF methods for a
//  given internuclear distance `R' and exponential parameter `alpha'.

class H2qchem {

    // Fields to store the relevant quantities
    // -- `ints' is a `H2ints' object with the integrals over basis functions
    // -- `Vnn' is the nucleus-nucleus repulsion
    // -- `Scc' is the covalent/covalent overlap integral
    // -- `Sci' is the covalent/ionic overlap integral
    // -- `Sii' is the ionic/ionic overlap integral
    // -- `Hcc' is the covalent/covalent Hamiltonian integral
    // -- `Hci' is the covalent/ionic Hamiltonian integral
    // -- `Hii' is the ionic/ionic Hamiltonian integral
    // -- `VB is the total energy of the Valence Bond method
    // -- `MO is the total energy of the Molecular Orbital method
    // -- `CF is the total energy of the Coulson-Fischer method
    // -- `gamma' is the optimized Coulson-Fischer parameter

    // Constructor
    // -- `R' is the internuclear distance
    // -- `alpha' is the exponential parameter

    constructor(R, alpha) {

        // Set the integrals over basis functions
        this.ints = new H2ints(R, alpha);

        // Set nucleus-nucleus repulsion
        this.Vnn = 1/R;

        // Set the overlap integrals
        this.Sii = this.Scc = 2 + 2*this.ints.ab*this.ints.ab;
        this.Sci = 4*this.ints.ab;

        // Compute some auxiliary integrals `<**|H|**>'
        let aaHaa = 2*(this.ints.aTa + this.ints.aNaa + this.ints.aNba) +
            this.ints.aaaa;
        let aaHab = (this.ints.aTa + this.ints.aNaa +
                     this.ints.aNba)*this.ints.ab +
            this.ints.aTb + 2*this.ints.aNbb + this.ints.aaab;
        let abHab = 2*(this.ints.aTa + this.ints.aNaa + this.ints.aNba) +
            this.ints.abab;
        let aaHbb = (2*this.ints.aTb + 4*this.ints.aNbb)*this.ints.ab +
            this.ints.aabb;

        // Set the Hamiltonian integrals
        this.Hcc = 2*(abHab + aaHbb);
        this.Hii = 2*(aaHaa + aaHbb);
        this.Hci = 4*aaHab;

        // Set the VB total energy
        this.VB = this.Vnn + this.Hcc/this.Scc;

        // Set the MO total energy
        this.MO = this.Vnn + (this.Hcc + this.Hii + 2*this.Hci) /
            (this.Scc + this.Sii + 2*this.Sci);

        // Set the CF electronic energy
        {
            let a = this.Scc*this.Sii - this.Sci*this.Sci;
            let b = 2*this.Hci*this.Sci - this.Hcc*this.Sii -
                this.Hii*this.Scc;
            let c = this.Hcc*this.Hii - this.Hci*this.Hci;

            // Apparently, `b' is always positive, so use traditional way
            // of solving quadratic equations
            this.CF = (-b - Math.sqrt(b*b - 4*a*c))/(2*a);
        }

        // Set the optimized `gamma' parameter
        {
            // Assume `cc = 1'
            let ci = -(this.Hcc - this.CF*this.Scc) /
                (this.Hci - this.CF*this.Sci);
            this.gamma = ci/(1 + Math.sqrt(1-ci*ci));
        }

        // Add the nucleus-nucleus repulsion to CF's electronic energy
        this.CF += this.Vnn;
    }

    // Return the total energy corresponding to the trial function
    //             (1+gamma^2) Psi_c + (2gamma) Psi_i

    tfnt(gamma) {
        let cc = 1 + gamma*gamma;
        let ci = gamma + gamma;
        let res = (cc*cc*this.Hcc + ci*ci*this.Hii + 2*cc*ci*this.Hci);
        res /= (cc*cc*this.Scc + ci*ci*this.Sii + 2*cc*ci*this.Sci);
        res += this.Vnn;

        return res;
    }
}
