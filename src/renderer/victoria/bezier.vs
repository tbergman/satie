attribute float t;
uniform vec4 uBezierX;
uniform vec4 uBezierY;
uniform vec4 uBezierR;
uniform vec4 uColorAndStroke;

void main() {
    float t2;
    float omt2;
    if (t < 0.5) {
        t2 = t*2.0;
        omt2 = 1.0 - t2;
        gl_Position = vec4(
            omt2*omt2*omt2*uBezierX.s +
                3.0*omt2*omt2*t2*uBezierX.t +
                3.0*omt2*t2*t2*uBezierX.p +
                t2*t2*t2*uBezierX.q,
            omt2*omt2*omt2*uBezierY.s +
                3.0*omt2*omt2*t2*uBezierY.t +
                3.0*omt2*t2*t2*uBezierY.p +
                t2*t2*t2*uBezierY.q,
            1.0, 1.0);
    } else {
        t2 = (t - 0.5)*2.0;
        omt2 = 1.0 - t2;

        gl_Position = vec4(
            omt2*omt2*omt2*uBezierX.q +
                3.0*omt2*omt2*t2*uBezierR.s +
                3.0*omt2*t2*t2*uBezierR.p +
                t2*t2*t2*uBezierX.s,
            omt2*omt2*omt2*uBezierY.q +
                3.0*omt2*omt2*t2*uBezierR.t +
                3.0*omt2*t2*t2*uBezierR.q +
                t2*t2*t2*uBezierY.s,
            1.0, 1.0);
    }
}
