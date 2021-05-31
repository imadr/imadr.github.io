#include "quaternion.h"
#include <stdio.h>

int main(){
    Quaternion q = (Quaternion){1, 2, 3, 4};
    printf("%f %f %f %f\n", q.x, q.y, q.z, q.w);
    return 0;
}