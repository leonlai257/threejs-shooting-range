import * as THREE from 'three';

import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import Bullet from './Bullet';

export default class BlasterScene extends THREE.Scene {
    private readonly mtlLoader = new MTLLoader();
    private readonly objLoader = new OBJLoader();

    private readonly camera: THREE.PerspectiveCamera;

    private readonly keyDown = new Set<string>();

    private blaster?: THREE.Group;
    private directionVector = new THREE.Vector3();

    private bullets: Bullet[] = [];
    private targets: THREE.Group[] = [];

    constructor(camera: THREE.PerspectiveCamera) {
        super();

        this.camera = camera;
    }

    async initialize() {
        let startingPosX = -2;
        for (let i = 1; i <= 5; i++) {
            const target = await this.createTarget();
            target.position.set(startingPosX++, 0, -3);
            this.add(target);
            this.targets.push(target);
        }

        this.blaster = await this.createBlaster();
        this.add(this.blaster);

        this.blaster.position.set(0, 0, 3);
        this.blaster.rotation.set(0, 0, 0);
        this.blaster.add(this.camera);

        this.camera.position.set(0, 0.5, 1);

        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(0, 4, 2);

        this.add(light);

        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
    }

    private handleKeyDown = (event: KeyboardEvent) => {
        this.keyDown.add(event.key.toLowerCase());
    };

    private handleKeyUp = async (event: KeyboardEvent) => {
        this.keyDown.delete(event.key.toLowerCase());

        if (event.key.toLowerCase() === ' ') {
            await this.createBullet();
        }
    };

    private updateInput = () => {
        if (!this.blaster) {
            return;
        }

        const shiftKey = this.keyDown.has('shift');

        if (!shiftKey) {
            if (this.keyDown.has('a') || this.keyDown.has('arrowleft')) {
                this.blaster.rotateY(0.02);
            }
            if (this.keyDown.has('d')) {
                this.blaster.rotateY(-0.02);
            }
        }

        const dir = this.directionVector;

        this.camera.getWorldDirection(dir);

        const speed = 0.1;

        if (this.keyDown.has('w')) {
            this.blaster.position.add(dir.clone().multiplyScalar(speed));
        }
        if (this.keyDown.has('s')) {
            this.blaster.position.add(dir.clone().multiplyScalar(-speed));
        }

        if (shiftKey) {
            const strafeDir = dir.clone();
            const upVector = new THREE.Vector3(0, 1, 0);

            if (this.keyDown.has('a')) {
                this.blaster.position.add(
                    strafeDir
                        .applyAxisAngle(upVector, Math.PI * 0.5)
                        .multiplyScalar(speed)
                );
            }

            if (this.keyDown.has('d')) {
                this.blaster.position.add(
                    strafeDir
                        .applyAxisAngle(upVector, Math.PI * -0.5)
                        .multiplyScalar(speed)
                );
            }
        }
    };

    private createBlaster = async () => {
        const blasterMtl = await this.mtlLoader.loadAsync(
            'assets/blasterG.mtl'
        );
        blasterMtl.preload();

        const blaster = await this.createModel(
            blasterMtl,
            'assets/blasterG.obj'
        );

        return blaster;
    };

    private createBullet = async () => {
        if (!this.blaster) {
            return;
        }

        const bulletMtl = await this.mtlLoader.loadAsync(
            'assets/foamBulletB.mtl'
        );
        bulletMtl.preload();

        const bullet = await this.createModel(
            bulletMtl,
            'assets/foamBulletB.obj'
        );

        this.camera.getWorldDirection(this.directionVector);

        const aabb = new THREE.Box3().setFromObject(bullet);
        const size = aabb.getSize(new THREE.Vector3());

        const blasterVector = this.blaster.position.clone();
        blasterVector.y += 0.06;

        bullet.position.add(
            blasterVector.add(
                this.directionVector.clone().multiplyScalar(size.z * 0.5)
            )
        );

        bullet.children.forEach((child) => child.rotateX(Math.PI * -0.5));

        bullet.rotation.copy(this.blaster.rotation);

        this.add(bullet);

        const b = new Bullet(bullet);
        b.setVelocity(
            this.directionVector.x * 0.2,
            this.directionVector.y * 0.2,
            this.directionVector.z * 0.2
        );

        this.bullets.push(b);
    };

    private updateBullets = () => {
        for (let i = 0; i < this.bullets.length; ++i) {
            const b = this.bullets[i];
            b.update();

            if (b.shouldRemove) {
                this.remove(b.group);
                this.bullets.splice(i, 1);
                i--;
            } else {
                for (let j = 0; j < this.targets.length; ++j) {
                    const t = this.targets[j];

                    if (t.position.distanceToSquared(b.group.position) < 0.05) {
                        this.remove(b.group);
                        this.bullets.splice(i, 1);
                        i--;

                        t.visible = false;
                        setTimeout(() => {
                            t.visible = true;
                        }, 1000);
                    }
                }
            }
        }
    };

    private createTarget = async () => {
        const targetMtl = await this.mtlLoader.loadAsync('assets/targetA.mtl');
        targetMtl.preload();

        const target = await this.createModel(targetMtl, 'assets/targetA.obj');

        return target;
    };

    private async createModel(
        mtl: MTLLoader.MaterialCreator,
        objFilePath: string
    ) {
        this.objLoader.setMaterials(mtl);

        const modelRoot = await this.objLoader.loadAsync(objFilePath);

        modelRoot.rotateY(Math.PI * 0.5);

        return modelRoot;
    }

    update() {
        this.updateInput();
        this.updateBullets();
    }
}
