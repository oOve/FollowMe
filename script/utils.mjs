

export function vNeg(p){ // Return -1*v
    return {x:-p.x, y:-p.y};
}
export function vAdd(p1, p2){ // Return the sum, p1 + p2
    return {x:p1.x+p2.x, y:p1.y+p2.y };
}
export function vSub(p1, p2){// Return the difference, p1-p2
    return {x:p1.x-p2.x, y:p1.y-p2.y };
}
export function vMult(p,v){ // Multiply vector p with value v
    return {x:p.x*v, y: p.y*v};  
}
export function vDot(p1, p2){ // Return the dot product of p1 and p2
    return p1.x*p2.x + p1.y*p2.y;
}
export function vLen(p){ // Return the length of the vector p
    return Math.sqrt(p.x**2 + p.y**2);
}
export function vNorm(p){ // Normalize the vector p, p/||p||
    return vMult(p, 1.0/vLen(p));
}
export function vAngle(p){ // The foundry compatible 'rotation angle' to point along the vector p
    return 90+Math.toDegrees(Math.atan2(p.y, p.x));
}
  
  // An implementation of hermite-like interpolation. The derivative is hermite-like, whereas the position is linearly interpolated
 export class SimpleSpline{
    constructor(points, smoothness=0.0){
      this.p = points;
      this.smoothness = smoothness;
      this.lengths = [];
      for (let i = 1; i < this.len; ++i){
        this.lengths.push( vLen(vSub(this.p[i-1], this.p[i])) );
      }
    }
    parametricLength(){
      return this.lengths.reduce((p, a)=>p+a,0);
    }
    get len (){
      return this.p.length;
    }
    get plen(){
      return this.parametricLength();
    }
  
    // Position at parametric position t
    parametricPosition( t ){
      if (this.len<2){return this.p[0];}    
      let len = 0;
      for (let i = 1; i < this.len; ++i){
        let nlen = this.lengths[i-1];
        if (len+nlen >= t){
          let nfrac = (t-len)/(nlen);//normalized fraction
          // returning (1-nt)*prev + nt*cur
          return vAdd(vMult(this.p[i-1], 1-nfrac), vMult(this.p[i], nfrac) );
        }
        len += nlen;
      }
      // we have gone past our parametric length, clamp at last point
      return this.p[this.len-1];
    }
  
    #iNorm(i){
      if(i<1){
        return vNorm(vSub(this.p[0], this.p[1]));
      }
      if(i > (this.len-2)){
        // last (or past last) point, return (last - next to last)
        return vNorm(vSub(this.p[this.len-2], this.p[this.len-1]));
      }
      return vNorm( vSub(this.p[i-1], this.p[i+1]));
    }

    prune(before){
        if (this.len<=2)return;
        let cumsum = 0;
        let i = 0;
        for(;cumsum < before; ++i){
            cumsum+=this.lengths[i];
        }
        --i;
        if (i>0){
            this.lengths = this.lengths.slice(i);
            this.p = this.p.slice(i);
        }
    }
  
    // Derivative at parametric position t
    derivative(t){
      if (t<=0){ 
        return this.#iNorm(0);
      }
      let len = 0;
      for (let i = 1; i < this.len; ++i){
        let nlen = this.lengths[i-1];
        if ((len+nlen) >= t){
          let nfrac = (t-len)/(nlen);//normalized fraction
          let p = this.#iNorm(i-1);
          let n = this.#iNorm(i);
          return vNorm( vAdd(vMult(p,1-nfrac), vMult(n,nfrac)) );
        }
        len += nlen;
      }
      return this.#iNorm(this.len);
    }
  }
