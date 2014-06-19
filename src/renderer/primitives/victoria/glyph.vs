attribute vec2 vTexCoord; /* [1, 1], [0, 1], [1, 0], [0, 0] */

uniform vec4 uGlyphInfo;
uniform vec4 uPosInfo;

varying vec2 v_texCoord;

void main()
{
    gl_Position = vec4(
        uPosInfo.x + uPosInfo.p*vTexCoord.s,
        uPosInfo.y + uPosInfo.q*vTexCoord.t,
        1.0, 1.0);
    v_texCoord = vec2(
        (vTexCoord.s > 0.5) ? uGlyphInfo.t : uGlyphInfo.s,
        (vTexCoord.t > 0.5) ? uGlyphInfo.p : uGlyphInfo.q);
}
