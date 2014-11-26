attribute vec3 va_position;
attribute vec3 va_normal;
attribute vec2 va_texcoord;

uniform mat4 u_modelview_matrix;
uniform mat4 u_projection_matrix;
uniform mat3 u_normal_matrix;

varying vec2 v_texcoord;
varying vec3 v_normal;
varying vec3 v_position;

void main(void) {
	gl_Position = u_projection_matrix * u_modelview_matrix * vec4(va_position, 1.0);
	v_texcoord = va_texcoord;
	vec4 pos = u_modelview_matrix * vec4(va_position, 1);
	v_position = pos.xyz;
	v_normal = u_normal_matrix * va_normal;
}