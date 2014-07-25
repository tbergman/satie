uniform vec4 uColorAndSkew;

void main() {
    gl_FragColor = vec4(uColorAndSkew.rgb, 1.0);
}
