import PfXRJointSpace from "./XRJointSpace.js";

export default class XRHand{

	#internalJoints = [];

	static WRIST = 0;

	static THUMB_METACARPAL = 1;
	static THUMB_PHALANX_PROXIMAL = 2;
	static THUMB_PHALANX_DISTAL = 3;
	static THUMB_PHALANX_TIP = 4;

	static INDEX_METACARPAL = 5;
	static INDEX_PHALANX_PROXIMAL = 6;
	static INDEX_PHALANX_INTERMEDIATE = 7;
	static INDEX_PHALANX_DISTAL = 8;
	static INDEX_PHALANX_TIP = 9;

	static MIDDLE_METACARPAL = 10;
	static MIDDLE_PHALANX_PROXIMAL = 11;
	static MIDDLE_PHALANX_INTERMEDIATE = 12;
	static MIDDLE_PHALANX_DISTAL = 13;
	static MIDDLE_PHALANX_TIP = 14;

	static RING_METACARPAL = 15;
	static RING_PHALANX_PROXIMAL = 16;
	static RING_PHALANX_INTERMEDIATE = 17;
	static RING_PHALANX_DISTAL = 18;
	static RING_PHALANX_TIP = 19;

	static LITTLE_METACARPAL = 20;
	static LITTLE_PHALANX_PROXIMAL = 21;
	static LITTLE_PHALANX_INTERMEDIATE = 22;
	static LITTLE_PHALANX_DISTAL = 23;
	static LITTLE_PHALANX_TIP = 24;

	constructor(){
		this.length = 25;

		for(let i=0; i<this.length; i++){
			this.#internalJoints[i] = new PfXRJointSpace();
		}

		return new Proxy(this, {
			get: (target, name) => {
				const nameInt = parseInt(name);
				if(isNaN(nameInt)){
					return target[name];
				}

				return this.#internalJoints[name] || null;
			},
		});
	}
}

if(!("XRHand" in window)){
	window.XRHand = XRHand;
}
