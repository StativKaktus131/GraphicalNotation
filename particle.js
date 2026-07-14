class Particle {
    constructor(originPos) {
        this.pos = createVector(originPos.x, originPos.y);
        this.lifetime = random(50, 70);
        this.dir = p5.Vector.fromAngle(radians(random(0, 360)));
        this.speed = random(0.92, 0.98);
        this.t = 0;
    }

    tick() {
        this.t++;
        if (this.t > this.lifetime)
            mouseParticles.splice(mouseParticles.indexOf(this), 1);

        this.pos = this.pos.add(this.dir.mult(this.speed));
    }

    render() {
        noStroke();
        fill(255, 255, 255, (1. - (this.t / this.lifetime)) * 255.)
        circle(this.pos.x, this.pos.y, 5);
    }
}