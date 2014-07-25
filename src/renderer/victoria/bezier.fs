uniform vec4 uColorAndStroke;

void main() {
    gl_FragColor = vec4(uColorAndStroke.rgb, 1.0);
}
