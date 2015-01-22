# Jam
A small assembly like toy language.

Factorial (Or at least what it should look like):
```nasm
; the def instruction creates a function label
; which can only be jumped to using the call instruction.
; call first puts the 'address' of the next instruction into the link register
; and then jumps to the given function label (or instead tries to find a function with the name
; in javascript). The end instruction just branches to r14. It is still important because it
; allows the def instruction to skip to the end if it isn't being called.

def factorial:			; Defines a function called factorial
    pop r0
    push #1				; This is the value that will be going to r1, so I make sure to clear it here.
    push r0
    factorial_fn_start:
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
	; call factorial -- DO NOT DO THIS. You will get an infinite loop because the link register will keep coming back here
    jmp factorial_fn_start
	end_factorial:		; A Label.
	pop r0				; Pops the last value of the stack into r0. (Gets rid of our marker for where we are in the factorial).
end						; The end of the factorial function.

mov r0, #9
push r0
call factorial
push #1					; Sets up our first argument for the 'dump' function.
call dump				; Calls the internal function 'dump'.
						; The first argument is the number of values that should be
						; Read from the stack and dumped onto the console.
```
