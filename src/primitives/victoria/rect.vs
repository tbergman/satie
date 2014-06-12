attribute vec2 vTexCoord; /* [1, 1], [0, 1], [1, 0], [0, 0] */
uniform vec4 uPosInfo;
uniform lowp vec4 uColorAndSkew;

void main() {
    gl_Position = vec4(
        uPosInfo.x + uPosInfo.z*vTexCoord.x,
        uPosInfo.y + uPosInfo.w*vTexCoord.y + uColorAndSkew.w*vTexCoord.x,
        1.0, 1.0);
}
