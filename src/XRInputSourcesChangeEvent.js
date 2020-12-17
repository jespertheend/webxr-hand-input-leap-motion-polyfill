export default class XRInputSourcesChangeEvent extends Event{
	constructor(type, initDict){
		super(type);

		this.session = initDict.session;
		this.added = initDict.added;
		this.removed = initDict.removed;
	}
}
