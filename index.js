module.exports = Events

function Events (source) {
	if (!(this instanceof Events)) {
		return Events.apply(Object.create(Events.prototype), [].slice.call(arguments))
	}

	this.handlers = []
	var eventNames = [].slice.call(arguments, 1);
	
	if (Array.isArray(source)) {
		if (typeof source[source.length-1] != 'string') {
			var sources = source.map(function (s) {
				return Events.apply(Object.create(Events.prototype), [s].concat(eventNames))
			})

			return EventsUnion.apply(Object.create(EventsUnion.prototype), sources)
		}
		this.target = source.pop()
		source = source.pop()
	}

	if (!source.addEventListener) {
		source = source.get(0)
	}

	this.source = source
	this.eventNames = eventNames
	return this;
}

Events.prototype.filter = function (predicate, name) {
	this.filters = this.filters || [];
	predicate.filterName = name
	this.filters.push(predicate)
	return this;
}

Events.prototype.prefixed = function (prefix) {
	this.prefix = prefix
	return this;
}

Events.prototype.on = function (handler) {
	this.handlers.push(handler)
	this.attachListeners()
}

Events.prototype.matchesTarget = function (e) {
	if (!this.target) return true;

	var possibleTargets = this.source.querySelectorAll(this.target)
	var target
	for (var i=0; i<possibleTargets.length; i++) {
		target = possibleTargets[i]
		if (target == e.target) return true
	}
	return false;
}

Events.prototype.dispatch = function (eventname, e) {
	if (this.filters) {
		for (var i = 0; i<this.filters.length;i++) {
			var filter = this.filters[i]
			if (!filter(e)) {
				return;
			}
		}
	}

	if (!this.matchesTarget(e)) return;

	var me = this
	if (me.prefix) {
		eventname = me.prefix + eventname
	}
	this.handlers.forEach(function (handler) {
		handler(eventname, e)
	})
}

Events.prototype.nonBubbling = ['mouseenter', 'mouseleave']

Events.prototype.attachListeners = function () {
	if (this.attachedListeners) return
	var me = this;
	this.eventNames.forEach(function (eventname) {
		if (me.nonBubbling.indexOf(eventname) != -1 && me.target) {
			var targets = [].slice.call(me.source.querySelectorAll(me.target))
			for (var i=0; i<targets.length; i++) {
				var t = targets[i]
				t.addEventListener(eventname, me.dispatch.bind(me, eventname))
			}
		} else {
			me.source.addEventListener(eventname, me.dispatch.bind(me, eventname))
		}
	})
	this.attachedListeners = true
}

Events.prototype.union = function (variadic) {
	var args = [].slice.call(arguments)
	args.unshift(this)
	return EventsUnion.apply(Object.create(EventsUnion.prototype), args)
}

function EventsUnion (variadicEvents) {
	this.parts = [].slice.call(arguments);
	this.handlers = [];
	return this;
}

EventsUnion.prototype.on = function (handler) {
	this.handlers.push(handler)
	this.attachListeners()
}

EventsUnion.prototype.attachListeners = function () {
	if (!this.hasAttachedListeners) {
		this.hasAttachedListeners = true;
		var me = this;
		this.parts.forEach(function (p) {
			p.on(me.dispatch.bind(me))
		})
	}
}

EventsUnion.prototype.dispatch = function (eventname, e) {
	var me;
	this.handlers.forEach(function (h) {
		h.call(me, eventname, e)
	})
}

EventsUnion.prototype.addSource = function (evSource) {
	this.parts.push(evSource)
	evSource.attachListeners()
	evSource.on(this.dispatch.bind(this))
}
