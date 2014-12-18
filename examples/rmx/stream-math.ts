
function vec3_stream_copy(
    out: Float32Array,
    out_offset: number,
    a: Float32Array,
    a_offset: number
    ): void {
    out[out_offset + 0] = a[a_offset + 0];
    out[out_offset + 1] = a[a_offset + 1];
    out[out_offset + 2] = a[a_offset + 2];
}

function quat_stream_copy(
    out: Float32Array,
    out_offset: number,
    a: Float32Array,
    a_offset: number
    ): void {
    out[out_offset + 0] = a[a_offset + 0];
    out[out_offset + 1] = a[a_offset + 1];
    out[out_offset + 2] = a[a_offset + 2];
    out[out_offset + 3] = a[a_offset + 3];
}

function vec3_stream_lerp(
    out: Float32Array,
    out_offset: number,
    a: Float32Array,
    a_offset: number,
    b: Float32Array,
    b_offset: number,
    t: number
    ): void {
    var ta: number = 1 - t;
    out[out_offset + 0] = ta * a[a_offset + 0] + t * b[b_offset + 0];
    out[out_offset + 1] = ta * a[a_offset + 1] + t * b[b_offset + 1];
    out[out_offset + 2] = ta * a[a_offset + 2] + t * b[b_offset + 2];
}

function quat_stream_slerp(
    out: Float32Array,
    out_offset: number,
    a: Float32Array,
    a_offset: number,
    b: Float32Array,
    b_offset: number,
    t: number
    ): void {

    var ax = a[a_offset + 0], ay = a[a_offset + 1], az = a[a_offset + 2], aw = a[a_offset + 3],
        bx = b[b_offset + 0], by = b[b_offset + 1], bz = b[b_offset + 2], bw = b[b_offset + 3];

    var omega: number, cosom: number, sinom: number, scale0: number, scale1: number;

    // calc cosine
    cosom = ax * bx + ay * by + az * bz + aw * bw;

    // adjust signs (if necessary)
    if (cosom < 0.0) {
        cosom = -cosom;
        bx = - bx;
        by = - by;
        bz = - bz;
        bw = - bw;
    }

    // calculate coefficients
    if ((1.0 - cosom) > 0.000001) {
        // standard case (slerp)
        omega = Math.acos(cosom);
        sinom = Math.sin(omega);
        scale0 = Math.sin((1.0 - t) * omega) / sinom;
        scale1 = Math.sin(t * omega) / sinom;
    } else {
        // "from" and "to" quaternions are very close 
        //  ... so we can do a linear interpolation
        scale0 = 1.0 - t;
        scale1 = t;
    }

    // calculate final values
    out[out_offset + 0] = scale0 * ax + scale1 * bx;
    out[out_offset + 1] = scale0 * ay + scale1 * by;
    out[out_offset + 2] = scale0 * az + scale1 * bz;
    out[out_offset + 3] = scale0 * aw + scale1 * bw;
}

function mat_stream_compose(
    out: Float32Array,
    out_offset: number,
    pos: Float32Array,
    pos_offset: number,
    rot: Float32Array,
    rot_offset: number,
    scl: Float32Array,
    scl_offset: number
    ): void {
    // Quaternion math
    var x = rot[rot_offset + 0],
        y = rot[rot_offset + 1],
        z = rot[rot_offset + 2],
        w = rot[rot_offset + 3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2,

        sx = scl[scl_offset + 0],
        sy = scl[scl_offset + 1],
        sz = scl[scl_offset + 2];

    out[out_offset + 0] = sx * (1 - (yy + zz));
    out[out_offset + 1] = sy * (xy + wz);
    out[out_offset + 2] = sz * (xz - wy);
    out[out_offset + 3] = 0;
    out[out_offset + 4] = sx * (xy - wz);
    out[out_offset + 5] = sy * (1 - (xx + zz));
    out[out_offset + 6] = sz * (yz + wx);
    out[out_offset + 7] = 0;
    out[out_offset + 8] = sx * (xz + wy);
    out[out_offset + 9] = sy * (yz - wx);
    out[out_offset + 10] = sz * (1 - (xx + yy));
    out[out_offset + 11] = 0;
    out[out_offset + 12] = pos[pos_offset + 0];
    out[out_offset + 13] = pos[pos_offset + 1];
    out[out_offset + 14] = pos[pos_offset + 2];
    out[out_offset + 15] = 1;
};

function mat4_stream_multiply(
    out: Float32Array,
    out_offset: number,
    a: Float32Array,
    a_offset: number,
    b: Float32Array,
    b_offset: number
    ): void {
    var a00 = a[a_offset + 0], a01 = a[a_offset + 1], a02 = a[a_offset + 2], a03 = a[a_offset + 3],
        a10 = a[a_offset + 4], a11 = a[a_offset + 5], a12 = a[a_offset + 6], a13 = a[a_offset + 7],
        a20 = a[a_offset + 8], a21 = a[a_offset + 9], a22 = a[a_offset + 10], a23 = a[a_offset + 11],
        a30 = a[a_offset + 12], a31 = a[a_offset + 13], a32 = a[a_offset + 14], a33 = a[a_offset + 15];

    // Cache only the current line of the second matrix
    var b0 = b[b_offset + 0], b1 = b[b_offset + 1], b2 = b[b_offset + 2], b3 = b[b_offset + 3];
    out[out_offset + 0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[out_offset + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[out_offset + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[out_offset + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[b_offset + 4]; b1 = b[b_offset + 5]; b2 = b[b_offset + 6]; b3 = b[b_offset + 7];
    out[out_offset + 4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[out_offset + 5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[out_offset + 6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[out_offset + 7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[b_offset + 8]; b1 = b[b_offset + 9]; b2 = b[b_offset + 10]; b3 = b[b_offset + 11];
    out[out_offset + 8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[out_offset + 9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[out_offset + 10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[out_offset + 11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[b_offset + 12]; b1 = b[b_offset + 13]; b2 = b[b_offset + 14]; b3 = b[b_offset + 15];
    out[out_offset + 12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[out_offset + 13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[out_offset + 14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[out_offset + 15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
};