//var factorial_test_source = "; def & end are just a label, and a jump instruction.\r\n; def defines a label that will only be accessible through the call\r\n; instruction. The call instruction puts the location of the next instruction\r\n; into register r14 (the link register) and then jump to the function\'s label.\r\n; the end instruction, like def is another was of creating a label, is just another\r\n; way of writing \'jmp r14\'.\r\n\r\ndef factorial:\t\t\t; Defines a function called factorial\r\n\tpop r0-r1\t\t\t; Pops 2 values from the stack into r0 and r1\r\n\teq r1, #0\t\t\t; If r1 == #0, then the next instruction is executed.\r\n\t\t\t\t\t\t; the next instruction is skipped if the condition is not true.\r\n\tmov r1, #1\t\t\t; Moves the value #1 into r1\r\n\teq r0, #0\r\n\tmov r0, #1\r\n\tmul r1, r1, r0\t\t; Multiples r1 and r0 and puts the result into r1.\r\n\tsub r0, r0, #1\t\t; Subtracts 1 from r0 and puts the result back into r0.\r\n\tpush r0-r1\t\t\t; Pushes r1 THEN r0 onto the stack.\r\n\teq r0, #0\r\n\tjmp end_factorial\t; Jumps to the label end_factorial.\r\n\tcall factorial\t\t; Calls the factorial function again.\r\n\tend_factorial:\t\t; A Label.\r\n\tpop r0\t\t\t\t; Pops the last value of the stack into r0. (Gets rid of our marker for where we are in the factorial).\r\nend\t\t\t\t\t\t; The end of the factorial function.\r\n\r\nmov r0, #9\r\npush r0\r\ncall factorial\r\npush #1\t\t\t\t\t; Sets up our first argument for the \'dump\' function.\r\ncall dump\t\t\t\t; Calls the internal function \'dump\' which takes two arguments.\r\n\t\t\t\t\t\t; The first argument is the number of values that should be\r\n\t\t\t\t\t\t; Read from the stack and dumped onto the console.";

var jam_source = document.getElementById("code").textContent;

var jam = new Jam();
jam.evaluate("test.jam", jam_source);
console.log("data:");
console.log(JSON.stringify(jam.context.registers, null, 4));
console.log("stack");
console.log(jam.context.stack);
