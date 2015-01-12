"use strict";

function log() {
    console.log.apply(console, arguments);
}

var JamInstruction = {
    POP: "pop",
    PUSH: "push",
    EQ: "eq",
    MOV: "mov",
    MUL: "mul",
    DIV: "div",
    ADD: "add",
    SUB: "sub",
    JMP: "jmp",
    CALL: "call",
}

var JamArg = {
    Register: function(value) {
        this.value = value;
        this.ja_type = "r";
    },
    
    Integral: function(value) {
        this.value = value;
        this.ja_type = "i";
    },
    
    RegisterRange: function(start, end) {
        this.start = start;
        this.end = end;
        this.ja_type = "rr";
    },
    
    Identifier: function(text) {
        this.text = text;
        this.ja_type = "id";
    },
    
    Label: function(name) {
        this.name = name;
        this.ja_type = "l";
    }
}

var Jam = (function() {
    function Jam() {
        this.reset();
        this.settings = {
            keep_source_info: true
        };
    }
    var _ = Jam.prototype;
    
    _.evaluate = function(source_name, source) {
        if(arguments.length < 2) {
            source = source_name;
            source_name = "SCRIPT - " + (++this.context.scripts_run);
        }
        log("Evaluating script %s.", source_name);
        new JamParser(this, this.context).parse(source);
        
        var start_time = Date.now();
        new JamExecutor(this, this.context).execute();
        var end_time = Date.now();
        var total_time = end_time - start_time;
        log("Execution completed in %dms", total_time);
        return this;
    }
    
    _.reset = function() {
        this.context = new JamContext(512, 512);
        return this;
    }
    
    return Jam;
})();

var JamParser = (function() {
    function JamParser(jam, context) {
        this.jam = jam;
        this.context = context;
        this.def_skip_instr = null;
    }
    var _ = JamParser.prototype;
    var _s = JamParser;
    
    _s.argRegex = /\s*,\s*/g;
    _s.exprs = {
        hex: /^0[xX]([0-9a-fA-F]+)$/, // group 1 is the hex digit part.
        dec: /^#([0-9]+)$/, // group one is the number part,
        identifier: /^[_a-zA-Z][_a-zA-Z0-9]*$/,
        label: /^([_a-zA-Z][_a-zA-Z0-9]*):$/,
        register: /^r([0-9]+)$/, // group 1 is the register number,
        register_range: /^r([0-9]+)\s*-\s*r([0-9]+)$/
    };
    
    _s.test_args = function() {
        if(arguments.length < 2) return true;
        var args = arguments[0];
        var i = 1;
        for(i; i < arguments.length; i++) {
            if( !(args[i-1] instanceof arguments[i]) ) return false;
        }
        return true;
    }
    
    _.parse = function(source) {
        var lines = source.split(/\n/g); // Split the script into lines.
        var i = 0;
        for(i; i < lines.length; i++) {
            this.process_line( this.sanitize_line(lines[i]), i+1 );
        }
    }
    
    _.sanitize_line = function(line) {
        var comment_index = line.indexOf(";");
        if(comment_index >= 0) {
            line = line.substr(0, comment_index);
        }
        return line.trim();
    }
    
    _.process_line = function(line, line_number) {
        if(!line || line.length < 1) return;
        //log("line #%d: %s", line_number, line);
        var args;
        var instr;
        
        var label_match;
        if(label_match = JamParser.exprs.label.exec(line)) {
            if(label_match[0] == label_match.input) { // Has to match the entire string :P
                this.define_label( [new JamArg.Label(label_match[1])], line_number );
                return; // Labels take priority over everything.
            }
        }
        
        var whitespace_index=-1;
        var wi=0;
        for(wi; wi < line.length; wi++) {
            if(line.charCodeAt(wi) <= 32) {
                whitespace_index = wi;
                break;
            }
        }
        if(whitespace_index >= 0) {
            instr = line.substr(0, whitespace_index) ;
            args = line.substr(whitespace_index + 1).split(JamParser.argRegex);
        } else {
            instr = line.trim();
            args = [];
        }
        
        args = this.process_args(args, line_number);
        
        var instr_added = false;
        if(instr === "def") {
            this.instr_def(args, line_number);
            instr_added = true;
        }  else if (instr === "end") {
            // end is encoded as a jmp instruction to r14.
            this.context.add_instr(JamInstruction.JMP, [new JamArg.Register(14)], line_number);
            if(this.def_skip_instr != null) {
                this.def_skip_instr.args.push( new JamArg.Integral(this.context.get_current_instruction_pos()) );
                this.def_skip_instr = null;
            }
            instr_added = true;
        } else {
            var key;
            for(key in JamInstruction) {
                var val = JamInstruction[key];
                if(val === instr) {
                    this.context.add_instr(val, args, line_number);
                    instr_added = true;
                    break;
                }
            }
        }
        
        if(!instr_added) {
            log("line #%d: Undefined instruction `%s` reached. ", line_number, instr, args);
        }
    }
    
    _.define_label = function(args, line_number) {
        if(JamParser.test_args(args, JamArg.Label)) {
            this.context.create_label(args[0]);
        } else {
            throw "bad argument at line " + line_number;
        }
    }
    
    _.instr_def = function(args, line_number) {
        if(JamParser.test_args(args, JamArg.Label)) {
            // This is the instruction that will skip the function :P
            // the argument is filled out by the end instruction.
            this.def_skip_instr = this.context.add_instr(JamInstruction.JMP, [], line_number);
            this.context.create_function_label(args[0]);
        } else {
            throw "bad argument at line " + line_number;
        }
    }
    
    _.process_args = function(args, line_number) {
        var pargs = args.map(function(o) {
            return this.process_arg(o, line_number);
        }, this);
        return pargs;
    }
    
    _.process_arg = function(arg, line_number) {
        var matches;
        if(matches = JamParser.exprs.label.exec(arg)) {
            return new JamArg.Label(matches[1]);
        } else if(matches = JamParser.exprs.register_range.exec(arg)) {
            return new JamArg.RegisterRange(parseInt(matches[1]), parseInt(matches[2]));
        } else if(matches = JamParser.exprs.register.exec(arg)) {
            return new JamArg.Register(parseInt(matches[1]));
        } else if(matches = JamParser.exprs.identifier.exec(arg)) {
            return new JamArg.Identifier(matches[0]);
        } else if(matches = JamParser.exprs.dec.exec(arg)) {
            return new JamArg.Integral(parseInt(matches[1]));
        } else if(matches = JamParser.exprs.hex.exec(arg)) {
            return new JamArg.Integral(parseInt(matches[1], 16));
        }
        return arg;
    }
    
    return JamParser;
})();

var JamExecutor = (function() {
    function JamExecutor(jam, context) {
        this.jam = jam;
        this.context = context;
    }
    var _ = JamExecutor.prototype;
    
    _.execute = function() {
        var opc = this.context.pc;
        var instr = this.context.instructions[this.context.pc]; // Fetches the instruction at the program counter.
        this.exec_instr(instr);
        if(opc == this.context.pc) {
            // no branch/jump has occurred.
            this.context.pc++;
        }
        if(this.context.pc < this.context.instructions.length) {
            this.execute();
        }
    }
    
    _.exec_instr = function(instr) {
//        log("#%d: %s", this.context.pc, JSON.stringify(instr));
        var handled = false;
        switch(instr.name) {
            case JamInstruction.MOV:
                this.exec_instr_mov(instr);
                handled = true;
                break;
            case JamInstruction.ADD:
                this.exec_instr_add(instr);
                handled = true;
                break;
            case JamInstruction.SUB:
                this.exec_instr_sub(instr);
                handled = true;
                break;
            case JamInstruction.MUL:
                this.exec_instr_mul(instr);
                handled = true;
                break;
            case JamInstruction.DIV:
                this.exec_instr_div(instr);
                handled = true;
                break;
            case JamInstruction.PUSH:
                this.exec_instr_push(instr);
                handled = true;
                break;
            case JamInstruction.POP:
                this.exec_instr_pop(instr);
                handled = true;
                break;
            case JamInstruction.JMP:
                this.exec_instr_jmp(instr);
                handled = true;
                break;
            case JamInstruction.EQ:
                this.exec_instr_eq(instr);
                handled = true;
                break;
            case JamInstruction.CALL:
                this.exec_instr_call(instr);
                handled = true;
                break;
        }
        if(!handled) {
            log("Unhandled but valid instruction ", instr);
        }
    }
    
    _.exec_instr_mov = function(instr) {
        if(JamParser.test_args(instr.args, JamArg.Register, JamArg.Register)) {
            // mov <register>, <register> -- Moves a value from one register to another.
            this.context.registers[instr.args[0].value] = this.context.registers[instr.args[1].value];
        } else if(JamParser.test_args(instr.args, JamArg.Register, JamArg.Integral)) {
            // mov <register>, <immediate-value> -- Moves an immediate value into a register.
            this.context.registers[instr.args[0].value] = instr.args[1].value;
        } else {
            throw "line #" + instr.line + ": bad arguments in `mov` instruction";
        }
    }
    
    _.reg = function(r) {
        return this.context.registers[r.value];
    }
    
    _.exec_instr_add = function(instr) {
        if(JamParser.test_args(instr.args, JamArg.Register, JamArg.Register, JamArg.Register)) {
            // add <register>, <register>, <register> -- Adds 2 registers and puts the result in the first register.
            this.context.registers[instr.args[0].value] = this.reg(instr.args[1]) + this.reg(instr.args[2]);
        } else if(JamParser.test_args(instr.args, JamArg.Register, JamArg.Register, JamArg.Integral)) {
            // add <register>, <register>, <immediate> -- Adds an immediate value to a register and puts the result into the first register.
            this.context.registers[instr.args[0].value] = this.reg(instr.args[1]) + instr.args[2].value;
        } else if(JamParser.test_args(instr.args, JamArg.Register, JamArg.Integral, JamArg.Register)) {
            // add <register>, <immediate>, <register> -- Adds a register to an immediate value and puts the result into the first register.
            this.context.registers[instr.args[0].value] = instr.args[1].value + this.reg(instr.args[2]);
        }
    }
    
    _.exec_instr_sub = function(instr) {
        if(JamParser.test_args(instr.args, JamArg.Register, JamArg.Register, JamArg.Register)) {
            // add <register>, <register>, <register> -- Subtracts 2 registers and puts the result in the first register.
            this.context.registers[instr.args[0].value] = this.reg(instr.args[1]) - this.reg(instr.args[2]);
        } else if(JamParser.test_args(instr.args, JamArg.Register, JamArg.Register, JamArg.Integral)) {
            // add <register>, <register>, <immediate> -- Subtracts an immediate value from a register and puts the result into the first register.
            this.context.registers[instr.args[0].value] = this.reg(instr.args[1]) - instr.args[2].value;
        } else if(JamParser.test_args(instr.args, JamArg.Register, JamArg.Integral, JamArg.Register)) {
            // add <register>, <immediate>, <register> -- Subtracts a register from an immediate value and puts the result into the first register.
            this.context.registers[instr.args[0].value] = instr.args[1].value - this.reg(instr.args[2]);
        }
    }
    
    _.exec_instr_mul = function(instr) {
        if(JamParser.test_args(instr.args, JamArg.Register, JamArg.Register, JamArg.Register)) {
            // add <register>, <register>, <register> -- Multiplies 2 registers and puts the result in the first register.
            this.context.registers[instr.args[0].value] = this.reg(instr.args[1]) * this.reg(instr.args[2]);
        } else if(JamParser.test_args(instr.args, JamArg.Register, JamArg.Register, JamArg.Integral)) {
            // add <register>, <register>, <immediate> -- Multiplies an immediate value and a register and puts the result into the first register.
            this.context.registers[instr.args[0].value] = this.reg(instr.args[1]) * instr.args[2].value;
        } else if(JamParser.test_args(instr.args, JamArg.Register, JamArg.Integral, JamArg.Register)) {
            // add <register>, <immediate>, <register> -- Multiplies a register and an immediate value and puts the result into the first register.
            this.context.registers[instr.args[0].value] = instr.args[1].value * this.reg(instr.args[2]);
        }
    }
    
    _.exec_instr_div = function(instr) {
        if(JamParser.test_args(instr.args, JamArg.Register, JamArg.Register, JamArg.Register)) {
            // add <register>, <register>, <register> -- Divides 2 registers and puts the result in the first register.
            this.context.registers[instr.args[0].value] = this.reg(instr.args[1]) / this.reg(instr.args[2]);
        } else if(JamParser.test_args(instr.args, JamArg.Register, JamArg.Register, JamArg.Integral)) {
            // add <register>, <register>, <immediate> -- Divides an immediate value and a register and puts the result into the first register.
            this.context.registers[instr.args[0].value] = this.reg(instr.args[1]) / instr.args[2].value;
        } else if(JamParser.test_args(instr.args, JamArg.Register, JamArg.Integral, JamArg.Register)) {
            // add <register>, <immediate>, <register> -- Divides a register and an immediate value and puts the result into the first register.
            this.context.registers[instr.args[0].value] = instr.args[1].value / this.reg(instr.args[2]);
        }
    }
    
    _.exec_instr_push = function(instr) {
        if(JamParser.test_args(instr.args, JamArg.Register)) {
            // push <register> -- Pushes the value of a single register onto the stack.
            this.context.push(this.reg(instr.args[0]));
        } else if(JamParser.test_args(instr.args, JamArg.Integral)) {
            // push <immediate> -- Pushes an immediate value onto the stack.
            this.context.push(instr.args[0].value);
        } else if(JamParser.test_args(instr.args, JamArg.RegisterRange)) {
            // push <register-range> -- Pushes values from a range of register onto the stack.
            if(instr.args[0].start < instr.args[0].end) {
                var i = instr.args[0].end;
                for(i; i >= instr.args[0].start; i--) {
                    this.context.push(this.context.registers[i]);
                }
            } else {
                throw "line #" + instr.line + ": bad register range: r" + instr.args[0].start + " - r" + instr.args[0].end;
            }
        }
    }
    
    _.exec_instr_pop = function(instr) {
        if(JamParser.test_args(instr.args, JamArg.Register)) {
            // pop <register> -- Pops a single value off of the stack and into a register.
            this.context.registers[instr.args[0].value] = this.context.pop();
        } else if(JamParser.test_args(instr.args, JamArg.RegisterRange)) {
            // pop <register> -- Pops values from the stack into a range of registers.
            if(instr.args[0].start < instr.args[0].end) {
                var i = instr.args[0].start;
                for(i; i <= instr.args[0].end; i++) {
                    this.context.registers[i] = this.context.pop(); 
                }
            } else {
                throw "line #" + instr.line + ": bad register range: r" + instr.args[0].start + " - r" + instr.args[0].end;
            }
        }
    }
    
    _.exec_instr_jmp = function(instr) {
        if(JamParser.test_args(instr.args, JamArg.Integral)) {
            // jmp <immediate> -- Jumps to an immediate instruction location.
            this.context.pc = instr.args[0].value;
        } else if (JamParser.test_args(instr.args, JamArg.Identifier)) {
            // jmp <label> -- Jumps to a label.
            var lloc = this.context.labels[instr.args[0].text];
            if(lloc === undefined) {
                throw "line #" + instr.line + ": undefined label `" + instr.args[0].text + "`";
            } else {
                this.context.pc = lloc;
            }
        }
    }
    
    _.exec_instr_eq = function(instr) {
    }
    
    _.exec_instr_call = function(instr) {
    }
    
    return JamExecutor;
})();

var JamContext = (function() {
    function JamContext(memory_size, stack_size) {
        this.scripts_run = 0;
        this.registers = new Int32Array(17);
        this.memory_size = memory_size;
        this.stack_size = stack_size;
        this.memory = new JamMemory(this.memory_size);
        this.stack = new JamMemory(this.memory, 0, this.stack_size);
        this.labels = {};
        this.function_labels = {};
        this.instructions = [];
        define_register_getters(this);
        
        this.sp = this.stack_size - 4;
    }
    
    var _ = JamContext.prototype;
    
    function define_register_getters(context) {
        var i = 0;
        for(i; i < 17; i++) {
            context.__defineGetter__("r" + i, function() {
                return context.registers[i];
            });
            
            context.__defineSetter__("r" + i, function(value) {
                context.registers[i] = value;
            });
        }
        
        // stack pointer
        context.__defineGetter__("sp", function() {
            return context.registers[13];
        });
        
        // lin register
        context.__defineGetter__("lr", function() {
            return context.registers[14];
        });
        
        // program counter
        context.__defineGetter__("pc", function() {
            return context.registers[15];
        });
        
        // program status register
        context.__defineGetter__("psr", function() {
            return context.registers[16];
        });
        
        
        // stack pointer
        context.__defineSetter__("sp", function(value) {
            context.registers[13] = value;
        });
        
        // lin register
        context.__defineSetter__("lr", function(value) {
            context.registers[14] = value;
        });
        
        // program counter
        context.__defineSetter__("pc", function(value) {
            context.registers[15] = value;
        });
        
        // program status register
        context.__defineSetter__("psr", function(value) {
            context.registers[16] = value;
        });
    }
    
    _.get_current_instruction_pos = function() {
        return this.instructions.length;
    }
    
    _.create_label = function(label) {
        return this.labels[label.name] = this.get_current_instruction_pos();
    }
    
    _.create_function_label = function(label) {
        return this.function_labels[label.name] = this.get_current_instruction_pos();
    }
    
    _.add_instr = function(name, args, line) {
        var instr = {"name": name, "args": args, "line": line};
        this.instructions.push(instr);
        return instr;
    }
    
    // Decrements the stack pointer and pushes a value onto the stack.
    _.push = function(value) {
        this.sp -= 4;
        this.memory.write32(this.sp, value);
    }
    
    // Pops a value off of the stack and advances the stack pointer.
    // Returns the value that was popped off of the stack.
    _.pop = function(value) {
        var data = this.memory.read32(this.sp);
        this.sp += 4;
        return data;
    }
    
    return JamContext;
})();

var JamMemory = (function() {
    function JamMemory(arg0, slice_offset, slice_size) {
        if(typeof arg0 === "number") {
            var default_size = arg0;
            default_size = JamUtil.word_align(default_size);
            this.buffer = new ArrayBuffer(default_size);
            this.view8 = new Int8Array(this.buffer, 0);
            this.view16 = new Int16Array(this.buffer, 0);
            this.view32 = new Int32Array(this.buffer, 0);
        } else {
            this.buffer = arg0.buffer;
            slice_size = JamUtil.word_align(slice_size);
            this.view8  =  new Int8Array(this.buffer, slice_offset, slice_size);
            this.view16 = new Int16Array(this.buffer, slice_offset, slice_size / 2);
            this.view32 = new Int32Array(this.buffer, slice_offset, slice_size / 4);
        }
    }
    
    var _ = JamMemory.prototype;
    
    _.read8 = function(offset) {
        return this.view8[offset];
    }
    
    _.read16 = function(offset) {
        return this.view16[Math.floor(offset / 2)];
    }
    
    _.read32 = function(offset) {
        return this.view32[Math.floor(offset / 4)];
    }
    
    _.write8 = function(offset, value) {
        this.view8[offset] = value;
    }
    
    _.write16 = function(offset, value) {
        this.view16[Math.floor(offset / 2)] = value;
    }
    
    _.write32 = function(offset, value) {
        this.view32[Math.floor(offset / 4)] = value;
    }
    
    return JamMemory;
})();

var JamUtil = (function() {
    function JamUtil() {
        throw "Please don't instantiate me. -JamUtil, 2015"
    }
    var _ = JamUtil.prototype;
    var _s = JamUtil;
    
    _s.word_align = function(value) {
        return value & 0xfffffffc;
    }
    
    _s.halfword_align = function(value) {
        return value & 0xfffffffe;
    }
    
    return JamUtil;
})();