precision mediump float;

varying vec2 v_texcoord;
varying vec3 v_normal;
varying vec3 v_position;

uniform vec3 u_ambient_color;
uniform vec3 u_light_direction;
uniform vec3 u_light_color;

void main(void) {
	float diffuse = max(dot(v_normal, u_light_direction), 0.0);
	vec3 light = u_ambient_color + u_light_color * diffuse;
	gl_FragColor = vec4(light, 1) + vec4(0.001*v_texcoord, 0, 0);
}
