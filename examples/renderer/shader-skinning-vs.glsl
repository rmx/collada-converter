attribute vec3 va_position;
attribute vec3 va_normal;
attribute vec2 va_texcoord;
attribute vec4 va_boneindex;
attribute vec4 va_boneweight;

uniform mat4 u_modelview_matrix;
uniform mat4 u_projection_matrix;
uniform mat3 u_normal_matrix;
uniform sampler2D u_bone_matrix;

varying vec2 v_texcoord;
varying vec3 v_normal;
varying vec3 v_position;

const float bone_texture_size = 32.0;

mat4 get_bone_matrix(float index) {
	float x = mod( index * 4.0, bone_texture_size );
	float y = floor( index * 4.0 / bone_texture_size );
	float texel_size = 1.0 / bone_texture_size;

	float u = (x + 0.5) * texel_size;
	float v = (y + 0.5) * texel_size;
	vec4 du = vec4(0, 1, 2, 3) * texel_size;

	vec4 v1 = texture2D(u_bone_matrix, vec2( u + du.x, v ));
	vec4 v2 = texture2D(u_bone_matrix, vec2( u + du.y, v ));
	vec4 v3 = texture2D(u_bone_matrix, vec2( u + du.z, v ));
	vec4 v4 = texture2D(u_bone_matrix, vec2( u + du.w, v ));

	return mat4(v1, v2, v3, v4);
}

void main(void) {
	mat4 bone1_mat = get_bone_matrix(va_boneindex.x);
	mat4 bone2_mat = get_bone_matrix(va_boneindex.y);
	mat4 bone3_mat = get_bone_matrix(va_boneindex.z);
	mat4 bone4_mat = get_bone_matrix(va_boneindex.w);

	mat4 skin_mat =
		va_boneweight.x * bone1_mat + 
		va_boneweight.y * bone2_mat + 
		va_boneweight.z * bone3_mat + 
		va_boneweight.w * bone4_mat;

	vec4 world_pos = skin_mat * vec4(va_position, 1.0);
	vec4 world_normal = skin_mat * vec4(va_normal, 0.0);

	vec4 eye_pos = u_modelview_matrix * vec4(world_pos.xyz, 1);
	vec3 eye_normal = u_normal_matrix * normalize(world_normal.xyz);
	gl_Position = u_projection_matrix * eye_pos;

	v_texcoord = va_texcoord;
	v_position = eye_pos.xyz;
	v_normal = eye_normal;
}