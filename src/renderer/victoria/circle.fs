/**
 * @file GLSL fragment shader for circles.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */
 
 uniform vec3 uColor;

void main() {
    gl_FragColor = vec4(uColor, 1.0);
}
