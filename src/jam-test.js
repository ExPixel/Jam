var jam_source = document.getElementById("code").textContent;

var jam = new Jam();
jam.define_fn("sqrt", function(context, instr) {
    var val = context.pop();
    var result = Math.sqrt(val);
    result = Math.floor(result);
    context.push(result);
});
jam.evaluate("test.jam", jam_source);
console.log("data:");
console.log(JSON.stringify(jam.context.registers, null, 4));
console.log("stack");
console.log(jam.context.stack);
