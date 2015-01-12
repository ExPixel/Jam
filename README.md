# Jam
A small assembly like toy language.

Factorial (Or at least what it should look like):
```nasm
; def & end are just a label, and a jump instruction.
; def defines a label that will only be accessible through the call
; instruction. The call instruction puts the location of the next instruction
; into register r14 (the link register) and then jump to the function's label.
; the end instruction, like def is another was of creating a label, is just another
; way of writing 'jmp r14'.

def factorial:			; Defines a function called factorial
	pop r0-r1			; Pops 2 values from the stack into r0 and r1
	eq r1, #0			; If r1 == #0, then the next instruction is executed.
						; the next instruction is skipped if the condition is not true.
	mov r1, #1			; Moves the value #1 into r1
	eq r0, #0
	mov r0, #1
	mul r1, r1, r0		; Multiples r1 and r0 and puts the result into r1.
	sub r0, r0, #1		; Subtracts 1 from r0 and puts the result back into r0.
	push r0-r1			; Pushes r1 THEN r0 onto the stack.
	eq r0, #0
	jmp end_factorial	; Jumps to the label end_factorial.
	call factorial		; Calls the factorial function again.
	end_factorial:		; A Label.
	pop r0				; Pops the last value of the stack into r0. (Gets rid of our marker for where we are in the factorial).
end						; The end of the factorial function.

mov r0, #9
push r0
call factorial
push #1					; Sets up our first argument for the 'dump' function.
call dump				; Calls the internal function 'dump' which takes two arguments.
						; The first argument is the number of values that should be
						; Read from the stack and dumped onto the console.
```