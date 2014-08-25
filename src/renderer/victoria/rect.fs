/**
 * @file GLSL fragment shader for untextured rectangles.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

uniform vec4 uColorAndSkew;

void main() {
    gl_FragColor = vec4(uColorAndSkew.rgb, 1.0);
}
