export default class XRPose{
	constructor({
		pos = {x: 0, y: 0, z: 0},
		dir = {x: 0, y: 0, z: 0},
		emulatedPosition = false,
	} = {}){
		this.transform = new XRRigidTransform(pos, dir);
		this.emulatedPosition = emulatedPosition;
	}
}
