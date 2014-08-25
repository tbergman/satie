/**
 * @file GLSL fragment shader for glyphs (textured rectangles).
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

uniform sampler2D sampler2d;
uniform vec3 uColor;

varying vec2 v_texCoord;

void main() {
    vec2 texCoord = vec2(v_texCoord.s, 1.0 - v_texCoord.t);
    vec4 color = texture2D(sampler2d, texCoord);
    gl_FragColor = vec4(uColor, color.a);
}
