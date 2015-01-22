function eval_jam_test() {
	var jam_source = document.getElementById("code").textContent;

	var jam = new Jam(2048, 256);
	__snake__(jam); // snake test
	jam.define_fn("sqrt", function(context, instr) {
	    var val = context.pop();
	    var result = Math.sqrt(val);
	    result = Math.floor(result);
	    context.push(result);
	});
	jam.evaluate("test.jam", jam_source);
}

function load_jam_script(u) {
	var request = new XMLHttpRequest();
	request.open("GET", u, true);
	request.responseType = "text";
	request.onload = function() {
		var jam_source = document.getElementById("code");
		jam_source.innerText = request.response;
		eval_jam_test();
	};
	request.send();
}

load_jam_script("/jam/snake/snake.jam");