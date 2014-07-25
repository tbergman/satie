#define TWO_PI 6.283185307179586

attribute float t;
uniform vec4 uCircleInfo;

void main() {
    gl_Position = vec4(
        uCircleInfo.x + uCircleInfo.p*cos(TWO_PI * t),
        uCircleInfo.y + uCircleInfo.q*sin(TWO_PI * t),
        1.0, 1.0);
}
