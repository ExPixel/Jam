var __snake__ = (function(jam) {
"use strict";

var canvas = document.getElementById("canvas");
var rend = canvas.getContext("2d");

var DEFAULT_FRAME_SKIP = 0;
var SCALING = 4;

var fskip = DEFAULT_FRAME_SKIP;

function render_interrupt(context, instr, jam) {
	fskip = DEFAULT_FRAME_SKIP;
	requestAnimationFrame(resume_snake_anim);
}

function resume_snake_anim() {
	if(fskip > 0) {
		fskip--;
		requestAnimationFrame(resume_snake_anim);
		return;
	}
	jam.continue_eval();
}

jam.define_fn("graphics_sync", function(context) {
	context.interrupt = render_interrupt;
});

jam.define_fn("init_listeners", function(context) {

});

jam.define_fn("clear_screen", function(context) {
	rend.clearRect(0, 0, canvas.width, canvas.height);
});

jam.define_fn("poke", function(context) {
	rend.scale(SCALING, SCALING);
	if(context.pop()) {rend.fillStyle = "black";}
	else rend.fillStyle = "white";
	rend.fillRect(context.pop(), context.pop(), 1, 1);
	rend.scale(1/SCALING, 1/SCALING);
});

});