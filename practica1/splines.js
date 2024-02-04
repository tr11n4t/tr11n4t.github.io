/*
  The following functions/classes will exported

   * Class `Spline', for handling cubic splines
   * Function `trimSpline', which returns a trimmed version of a spline
 */

//*****************************************************************************

/*
  Class `Spline' handles an interpolating cubic spline for a given set
  of data points `(xi,yi), i=0,1,...'.  The resulting spline `S' will
  have continuous first and second derivatives, and will interpolate
  the data as follows:
            S(xi) = yi, i=0,1,...

  The mathematical details can be found in:
    -- `Numerical Recipes', WH Press et al
    -- `Introduction to Numerical Analysis', J Stoer & R Bulirsch
 */

class Spline {

    // Private fields
             // derivatives.  The sequence is:
             //        [x0, y0, z0, x1, y1, z1, ...],
             // where `zi' are the second derivatives.  The array is ordered:
             //       x0 < x1 < x2 ...

    // Constructor
    constructor() {
        const N0 = 10;  // Initial points to be allocated

        // Initialize the data to contain up to `N0' points
        this.data_ = new Float64Array(3*N0);

        // No points yet
        this.N_ = 0;
    }

    //-------------------------------------------------------------------------

    // Return number of points in data array

    n() {
        return this.N_;
    }

    //-------------------------------------------------------------------------

    // Grant access to the data array

    data() {
        return this.data_;
    }

    //-------------------------------------------------------------------------

    // Add a new point to the data array.  The new point is appended to the end
    // of the array, so make sure that `xn < x', where `xn' correspond to the
    // last point that is already present in the array

    add(x,y) {

        // Check if there is enough space.  If not, reallocate
        let n3 = 3*this.N_;
        if (n3 == this.data_.length) {
            let n = Math.floor((n3)/2);  // Increase factor of 1.5
            let old = this.data_;
            this.data_ = new Float64Array(3*n);
            this.data_.set(old);
        }

        // Append new point
        this.data_[n3] = x;
        this.data_[n3+1] = y;
        this.N_++;
    }

    //-------------------------------------------------------------------------

    // Update the spline: compute the second derivatives at the points.
    // -- `da' is the first derivative at the first point
    // -- `db' is the first derivative at the lat point

    update(da, db) {

        // Implementation of the algorithm described in Stoer & Bulirsch

        // Allocate temporary array
        let u = new Float64Array(this.N_);

        // Initialize
        let ix = 0, iy = 1, iz = 2;
        let z = this.data_[iz] = -1/2;
        let hinv = 1 / (this.data_[ix+3] - this.data_[ix]);
        let dy = (this.data_[iy+3] - this.data_[iy])*hinv;
        u[0] = 3*(dy - da)*hinv;

        // Forward sweep (from 1 to N-1)
        for (let i=1; i+1<this.N_; ++i) {
            ix += 3; iy += 3; iz += 3;
            let hinv0 = hinv;
            hinv = 1 / (this.data_[ix+3] - this.data_[ix]);
            let dy0 = dy;
            dy = (this.data_[iy+3] - this.data_[iy])*hinv;
            let mu = hinv / (hinv0 + hinv);
            let p = 1/(z*mu + 2);
            u[i] = (6*(dy-dy0)*hinv0 - u[i-1])*mu*p;
            z = this.data_[iz] = (mu-1)*p;
        }

        // Forward sweep (N)
        u[this.N_-1] = (6*(db - dy)*hinv - u[this.N_-2]) / (z + 2);

        // Back substitution
        iz = 3*(this.N_-1) + 2;
        this.data_[iz] = u[this.N_-1];
        for (let i=this.N_-2; i>=0; --i) {
            iz -= 3;
            this.data_[iz] *= this.data_[iz+3];
            this.data_[iz] += u[i];
        }
    }

    //-------------------------------------------------------------------------

    // Return the index `j' of the subinterval fulfilling `x_j <= x < x_(j+1)'
    // If `x < x0', `0' is returned.
    // If `x_(n-1) <= x', `n-2' is returned, where `n' is the number of points

    sub(x) {
        // The subinterval is found by `binary search' (see Wikipedia)
        let l = 0;
        let h = this.N_ - 2;
        while (l != h) {
            let m = Math.ceil((l+h)/2);
            if (this.data_[3*m] > x)
                h = m - 1;
            else
                l = m;
        }
        return l;
    }

    //-------------------------------------------------------------------------

    // Returns the cubic interpolating polynomial corresponding to a given
    // subinterval
    // -- `x1', `y1', `z1' and `x2', `y2', `z2' define the subinterval,
    //    where `zi' are the second derivatives
    // -- The function returns the coefficients of the polynomial
    //          a*(x-x1)^3 + b*(x-x1)^2 + c*(x-x1) + d
    //    as an array `[a,b,c,d]'

    static cubic(x1, y1, z1, x2, y2, z2) {
        const HALF = 0.5;
        const SIXTH = 1/6;

        // Compute the polynomial from the expression given by Stoer & Bulirsch
        let h = x2 - x1;
        let hinv = 1/h;
        let a = (z2 - z1) * hinv * SIXTH;
        let b = z1 * HALF;
        let c = (y2 - y1) * hinv;
        c -= (2*z1 + z2) * h * SIXTH;
        let d = y1;

        // Return values
        return [a,b,c,d];
    }

    //-------------------------------------------------------------------------

    // Return the interpolating polynomial for a given subinterval
    // -- `x' determines the subinterval
    // -- The function returns an array `[a,b,c,d,sx]', where `sx' is the
    //    value of `x' shifted respect the beginning of the subinterval, and
    //    the polynomial is given by
    //          a*sx^3 + b*sx^2 + c*sx + d

    pol(x) {
        let i3 = this.sub(x)*3;
        return [...Spline.cubic(this.data_[i3], this.data_[i3+1],
                                this.data_[i3+2], this.data_[i3+3],
                                this.data_[i3+4], this.data_[i3+5]),
                x - this.data_[i3]];
    }

    //-------------------------------------------------------------------------

    // Compute and return the spline's value at `x'

    f0(x) {

        // Get the polynomial
        let [a, b, c, d, sx] = this.pol(x);

        // Evaluate the polynomial and return the value
        return ((sx*a + b)*sx + c)*sx + d;
    }

    //-------------------------------------------------------------------------

    // Compute and return the spline's value and its first derivative at `x'.
    // The values are returned inside an array: `[f, fp]'

    f1(x) {

        // Get the polynomial
        let [a, b, c, d, sx] = this.pol(x);

        // Evaluate and return the values
        return [((sx*a + b)*sx + c)*sx + d,
                (3*sx*a + 2*b)*sx + c];
    }

    //-------------------------------------------------------------------------

    // Compute and return the spline's value and its first and second
    // derivative at `x'.
    // The values are returned inside an array: `[f, fp, fpp]'

    f2(x) {

        // Get the polynomial
        let [a, b, c, d, sx] = this.pol(x);

        // Evaluate and return the values
        return [((sx*a + b)*sx + c)*sx + d,
                (3*sx*a + 2*b)*sx + c,
                6*sx*a + 2*b];
    }

    //-------------------------------------------------------------------------

    // Convert the polynomial for a given subinterval into a cubic Bézier curve
    //  -- `i' is the index of the subinterval (note that there are `n()'
    //     interpolation points but only `n()-1' subintervals)
    //  -- The result is returned as the array
    //             [x0, y0, x1, y1, x2, y2, x3, y3]
    //     where `(xi,yi)' are the coordinates of the four control points

    bezier(i) {

        // Get the control points at both ends
        let i3 = 3*i;
        let x0 = this.data_[i3];
        let y0 = this.data_[i3+1];
        let x3 = this.data_[i3+3];
        let y3 = this.data_[i3+4];

        // To get the control points in the middle, see
        //   https://math.stackexchange.com/questions/3770662
        // Basically, `x1' and `x2' are respectivelly one third and two
        // thirds along the subinterval, `y1' is computed so that the line
        // from `(x0,y0)' to `(x1,y1)' is a tangent to the curve at
        // `(x0,y0)', and similarly for `y2'

        let [a,b,c,d] = Spline.cubic(x0, y0, this.data_[i3+2], x3, y3,
                                     this.data_[i3+5]);
        let h3 = (x3-x0)/3;
        let x1 = x0 + h3;
        let y1 = c*h3 + d;
        let x2 = x1 + h3;
        let y2 = h3*(3*b*h3+2*c) + d;

        // Return result
        return [x0, y0, x1, y1, x2, y2, x3, y3];
    }

}

//*****************************************************************************

// Returns a trimmed version of an original spline by removing some of
// the interpolation points while trying to keep the accuracy higher than a
// target tolerance
//  -- `s0' is the original spline
//  -- `eps' is the target accuracy
//  -- The returned result is an array `[s, err]', where `s' is the trimmed
//     spline, and `err' an estimate of its error.

function trimSpline(s0, eps) {

    // Add the first point to the result
    let s = new Spline();
    s.add(s0.data()[0], s0.data()[1]);

    // Loop over all the other points
    let i0 = 0;
    let i = i0 + 2;
    while (i < s0.n()) {

        // Get a cubic polynomial from points `i0' and `i'
        let i30 = 3*i0;
        let i3 = 3*i;
        let [a,b,c,d] = Spline.cubic(s0.data()[i30], s0.data()[i30+1],
                                     s0.data()[i30+2], s0.data()[i3],
                                     s0.data()[i3+1], s0.data()[i3+2]);

        // Estimate error at points between `i0' and `i'
        let err = 0;
        for (let j=i0+1; j<i; ++j) {
            let j3 = 3*j;
            let x = s0.data()[j3] - s0.data()[i30];
            let f = ((x*a + b)*x + c)*x + d;
            let err0 = Math.abs(f - s0.data()[j3+1]);
            err = (err > err0) ? err : err0;
        }

        // Check error
        if (err <= eps) {
            // Error is good. Try next point
            ++i;
        } else {
            // Error is too large.  Add point `i-1' and go on
            s.add(s0.data()[i3-3], s0.data()[i3-2]);
            i0 = i - 1;
            i = i0 + 2;
        }
    }

    // Add the last point
    s.add(s0.data()[3*(s0.n()-1)], s0.data()[3*(s0.n()-1)+1]);

    // Update trimmed spline
    let da = s0.f1(s0.data()[0])[1];
    let db = s0.f1(s0.data()[3*(s0.n()-1)])[1];
    s.update(da, db);

    // Estimate error
    let err = 0;
    for (let i=0; i<s0.n(); ++i) {
        let err0 = Math.abs(s.f0(s0.data()[3*i]) - s0.data()[3*i+1]);
        err = (err > err0) ? err : err0;
    }

    // Return results
    return [s, err];
}
