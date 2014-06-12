attribute float vRad;
uniform vec4 uCircleInfo;

void main() {
    gl_Position = vec4(
        uCircleInfo.x + uCircleInfo.p*cos(vRad),
        uCircleInfo.y + uCircleInfo.q*sin(vRad),
        1.0, 1.0);
}
