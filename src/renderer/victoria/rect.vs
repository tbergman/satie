/**
 * @file GLSL vertex shader for untextured rectangles.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

attribute vec2 vTexCoord; /* [1, 1], [0, 1], [1, 0], [0, 0] */
uniform vec4 uPosInfo;
uniform vec4 uColorAndSkew;

void main() {
    gl_Position = vec4(
        uPosInfo.x + uPosInfo.z*vTexCoord.x,
        uPosInfo.y + uPosInfo.w*vTexCoord.y + uColorAndSkew.w*vTexCoord.x,
        1.0, 1.0);
}
