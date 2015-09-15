var $input = $('#input');
var input = $input.get(0);
var $d = $(document);
var $status = $('#status');
var $mb = $('#mini-buffer');
var mb = null;
var $body = $('html,body');
$(function(){
  $input.val('');
  var ime = false;
  input.focus();
  $input.blur(function(){
    input.focus();
    input.select();
  }).focusout(function(){
    input.focus();
    input.select();
  });
  setInterval(function(){
    input.focus();
    if(!ime)
      input.select();
  }, 100);
  var keyEventMap = {};
  var commands = {};
  var modes = {};
  modes.default = {keyEventMap: keyEventMap,
                  commands: commands,
                  name: 'default'};
  var current_mode = modes.default;
  var killRing = new Ring(16);
  Gmacs.modes = modes;
  var buffers = {'*scratch*' : new Buffer('#buffer', killRing)};
  var current_buffer_title = '*scratch*';
  var buffer = buffers[current_buffer_title];
  Gmacs.buffers = buffers;
  Gmacs.buffer = buffer;
  Gmacs.buffer_name = current_buffer_title;

  Gmacs.selectBuffer = function(buffer_name){
    if(Gmacs.preBufferNames == null){
      Gmacs.preBufferNames = [];
    };
    Gmacs.preBufferNames.push(Gmacs.buffer_name);
    Gmacs.buffer_name = buffer_name;
    Gmacs.buffer = buffer = buffers[buffer_name];
    buffer.setActive(true);
    var mode_stack = buffer.mode_stack;
    var mode = mode_stack[mode_stack.length-1];
    keyEventMap = mode.keyEventMap;
    commands = mode.commands;
  };
  // buffer.mode_stack.push(modes.default);
  buffer.setActive(true);



  Gmacs.past_input = null;
  var keyDown = null;
  var keyDownHit = false;

  prepareKeyEventMap(modes, commands, keyEventMap, buffer.lineDelimiter);


  // mini-buffer creation

  var mbKeyEventMap = {};
  var mbCommands = {};
  prepareKeyEventMap(modes, mbCommands, mbKeyEventMap, buffer.lineDelimiter);
  modes['mini-buffer-default'] = {keyEventMap: mbKeyEventMap,
                  commands: mbCommands,
                  name: 'mini-buffer-default'};
  mb = new Buffer('#mini-buffer', killRing, 'mini-buffer-default');
  mb.initHtml = function(uuid){
    return '<div id="BOF_'+uuid+'" class="BOF"></div><span id="prompt"></span><span class="line current"><span class="cursor" id="cursor_'+uuid+'"></span></span><div id="EOF_'+uuid+'" class="EOF"></div>';
    
  };
  mb.reset();
  mb.$prompt = $('#prompt');
  buffers['mini-buffer'] = mb;

  Gmacs.prompt = mb.prompt = function(args, promise){
    mb.givenArgs = args;
    mb.args = {};
    mb.promise = promise;
    mb.$prompt.text('');
    mb.promptNext();
    Gmacs.selectBuffer('mini-buffer');
  };

  mb.promptNext = function(preName, preValue){
    var arg = mb.curArg = mb.givenArgs.shift();
    if(arg){
      var txt = [mb.$prompt.text()];
      if(preName){
        txt.push(preName);
        txt.push(':');
        txt.push(preValue);
      }
      txt.push(arg.name+': ');
      mb.$prompt.text(txt.join(' '));
      if(arg.default){
        arg.default.split('').forEach(function(c){mb.insertChar(c);});
      }
    } else {
      mb.promise.success(mb.args);
      Gmacs.selectBuffer(Gmacs.preBufferNames.pop());
    }
  };

  // mb.mode_stack[0].keyEventMap = mbKeyEventMap;
  // mb.mode_stack[0].commands = mbCommands;

  mbCommands.insertLineDelimiter = function(opt){
    var $chars = $('.char', mb.$buffer); 
    var value = $chars.text();
    mb.args[mb.curArg.name] = value;
    $chars.remove();
    mb.promptNext(mb.curArg.name, value);
  };


  Gmacs.changeMode = function(mode_name){
    var mode = modes[mode_name];
    var buffer = Gmacs.buffer;
    keyEventMap = mode.keyEventMap;
    commands = mode.commands;
    buffer.mode_name = mode_name;
    buffer.mode_stack.push(mode);
  };

  Gmacs.popMode = function(){
    var buffer = Gmacs.buffer;
    var mode_stack = buffer.mode_stack;
    mode_stack.pop();
    var mode = mode_stack[mode_stack.length-1];
    keyEventMap = mode.keyEventMap;
    commands = mode.commands;
    buffer.mode_name = mode.name;
  };

  function invokeHandler(input){
    if(Gmacs.past_input != null){
      Gmacs.past_input = input = Gmacs.past_input + input;
      mb.insertText(Gmacs.past_input);
    }
    var buffer = Gmacs.buffer;
    var mode_stack = buffer.mode_stack;
    var mode = mode_stack[mode_stack.length-1];
    var keyEventMap = mode.keyEventMap;
    var commands = mode.commands;

    var command = keyEventMap[input];
    
    // console.log('invokeHandler');
    // console.log(command);
    var func = commands[command];
    if(func == null){
      func = commands[keyEventMap['<default>']];
    }

    if(func){
      // buffer.commandHistory.push(command);
      var status = func({buffer:buffer});
      buffer.fireEvent('command_executed', {buffer:buffer, command:command});
      var pos = buffer.getCursorPosition();
      $status.text('(' + pos.row+','+pos.column+')');
      if(typeof status != 'object' || !('keepPastInput' in status)
         || !status.keepPastInput){
        Gmacs.past_input = null;
        mb.clear();
      }
    } else {
      Gmacs.past_input = null;
			mb.clear();
    }
  }

  // $d.bind('compositionstart', function(e){
  $input.bind('compositionstart', function(e){
    // console.log('ime');
    // console.log(e);
    var buffer = Gmacs.buffer;
    ime = true;
    $input.css(buffer.$c.position());
    $input.css('z-index', '100');
    
  }).bind('compositionend', function(e){
    
    var timer = setInterval(function(){
      if(!ime){
        $input.val().split('').forEach(function(c){buffer.insertChar(c);});
        $input.val('');
        clearInterval(timer);
        $input.css({left:'-100px',top:'-100px'});
        // $input.css('z-index', '1');
        var pos = buffer.getCursorPosition();
        $status.text('(' + pos.row+','+pos.column+')');
      }
    },10);
    ime = false;
  });;
  
  $input.css({left:'-100px',top:'-100px'});

  // $d.keypress(function(e){
  $input.keypress(function(e){
    var mod = (e.altKey ? 'A' : '') + (e.shiftKey ? 'S' : '') + (e.metaKey ? 'M' : '') + (e.ctrlKey ? 'C' : '');
    if(!keyDownHit || mod){
      var char = String.fromCharCode(e.charCode);
      var input = null;
      if(mod.match(/(A|M|C){1,3}/)){
        input = mod + '-' + String.fromCharCode(keyDown).toLowerCase();
        keyDown = null;
      } else {
        input = mod ? mod + '-' + char : char;
      }
      if(!ime && input){
        // console.log(input);
        // console.log('charCode: ' + e.charCode);
        // console.log('keyCode: ' + e.keyCode);
        // console.log('converted char: ' + char);
        // console.log('char: ' + e.char);
        // console.log('key: ' + e.key);
        // console.log('input: ' + input);
        // console.log('---');

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        invokeHandler(input);
      }
    }
    keyDownHit = false;
  }).keydown(function(e){
    // console.log(e);
    var buffer = Gmacs.buffer;
    var mode_stack = buffer.mode_stack;
    var mode = mode_stack[mode_stack.length-1];
    var keyEventMap = mode.keyEventMap;
    var commands = mode.commands;
    
    var mod = (e.altKey ? 'A' : '') + (e.shiftKey ? 'S' : '') + (e.metaKey ? 'M' : '') + (e.ctrlKey ? 'C' : '');
    keyDown = e.keyCode;
    var input = null;
    if(mod.match(/(A|M|C){1,3}/)){
      var c = String.fromCharCode(keyDown);
      if(32 <= keyDown && keyDown <= 126){
        // nothing to do
      } else if(keyDown == 191){
        c = '/';
      } else if(keyDown == 173){
        c = '-';
      } else if(keyDown == 188){
        c = ',';
      } else if(keyDown == 189){ // safari 
        c = '-';
      } else if(keyDown == 190){
        c = '.';
      } else if(keyDown == 229){ // safari 
        c = '/';
      } else if(keyDown == 219){ // safari 
        c = '@';
      } else {
        c = '';
      }
      input = mod + '-' + c.toLowerCase();
      // console.log(input);
      keyDown = null;
    } else {
      input = vkCodeMap[keyDown];
    }

    if(!ime && input){
      // console.log(input);
      
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if(Gmacs.past_input){
        input = Gmacs.past_input + input;
      }
      var command = keyEventMap[input];
      var func = commands[command];
      // for(var a in keyEventMap){
      // console.log(a);
      //}

      //for(var a in commands){
      //console.log(a);
      //}

      if(func == null && c != ''){
        func = commands[keyEventMap['<default>']];
      }
      if(func){
        // buffer.commandHistory.push(command);
        var status = func({buffer:buffer});
        buffer.fireEvent('command_executed', {buffer:buffer, command:command});
        var pos = buffer.getCursorPosition();
        $status.text('(' + pos.row+','+pos.column+')');
        if(typeof status != 'object' || !('keepPastInput' in status) || !status.keepPastInput){
          Gmacs.past_input = null;
          mb.clear();
        }
      } else {
        keyDownHit = !!keyDown;
				mb.clear();
      }
    }
  });
});

function prepareKeyEventMap(modes, commands, keyEventMap, lineDelimiter){
  
  prepareBasicKeyInputHandler();
  prepareCursorOperationHandler();
  prepareCombinationSequences();
  prepareMarkOperations();
  prepareUndoRedoOperations();

  function prepareUndoRedoOperations(){
    commands.undo = undo;
    commands.redo = redo;
    keyEventMap['C-/'] = keyEventMap['C--'] = 'undo';
    keyEventMap['C-.'] = keyEventMap['C-,'] = 'redo';
  }

  function prepareMarkOperations(){
    commands.markSet = markSet;
    commands.swapMarkAndCursor = swapMarkAndCursor;
    commands.moveToPreMark = moveToPreMark;
    commands.cutRegion = cutRegion;
    commands.copyRegion = copyRegion;
    commands.yankRegion = yankRegion;
    commands.yankPrevRegion = yankPrevRegion;
    keyEventMap['C-@'] = keyEventMap['C- '] = 'markSet';
    keyEventMap['C-xC-x'] = 'swapMarkAndCursor';
    keyEventMap['C-uC- '] = keyEventMap['C-uC-@'] = 'moveToPreMark';
    keyEventMap['C-w'] = 'cutRegion';
    keyEventMap['A-w'] = keyEventMap['M-w'] = 'copyRegion';
    keyEventMap['C-y'] = 'yankRegion';
    keyEventMap['A-y'] = keyEventMap['M-y'] = 'yankPrevRegion';
  }

  function prepareBasicKeyInputHandler(){
    for(var code=32;code <= 126; code++){
      var char = String.fromCharCode(code);
      // console.log(char);
      var handler = generateKeyInputHandler(char);
      var commandName = 'insertChar(' + char + ')';
      commands[commandName] = handler;
      keyEventMap[char] = commandName;
      keyEventMap['S-' + char] = commandName;
    }
    var insertLineDelimiter = generateKeyInputHandler(lineDelimiter || '\n');
    commands.insertLineDelimiter = insertLineDelimiter;
    keyEventMap['C-m'] = keyEventMap['Enter'] = 'insertLineDelimiter';
    commands.backspace = backspace;
    keyEventMap['C-h'] = keyEventMap['Backspace'] = 'backspace';
    commands.deleteChar = deleteChar;
    keyEventMap['C-d'] = keyEventMap['Del'] = 'deleteChar';
  }

  function prepareCombinationSequences(){
    setKeepSequenceHandler('C-u');
    setKeepSequenceHandler('C-x');
    setKeepSequenceHandler('C-c');
    commands.reset = reset;
    keyEventMap['C-xk'] = 'reset';
  }

  function setKeepSequenceHandler(sequence){
    var commandName =  'keepSequence(' + sequence + ')';
    keyEventMap[sequence] = commandName;
    commands[commandName] = function(opt){
      if(Gmacs.past_input != null){
        Gmacs.past_input += sequence;
      } else {
        Gmacs.past_input = sequence;
      }
      mb.insertText(Gmacs.past_input);
      // console.log(Gmacs.past_input);
      return {keepPastInput : true};
    };
  }

  function generateKeyInputHandler(char){
    return function(opt){
      // console.log('#' + char + '#');
      var buffer = opt.buffer;
      buffer.insertChar(char);
    };
  }

  function reset(opt){
    var buffer = opt.buffer;
    buffer.reset();
  }

  function markSet(opt){
    var buffer = opt.buffer;
    buffer.markSet();
  }

  function swapMarkAndCursor(opt){
    var buffer = opt.buffer;
    buffer.swapMarkAndCursor();
  }

  function cutRegion(opt){
    var buffer = opt.buffer;
        buffer.cutRegion();
  }

  function copyRegion(opt){
    var buffer = opt.buffer;
    buffer.copyRegion();
  }

  function yankRegion(opt){
    var buffer = opt.buffer;
    buffer.yankRegion();
  }

  function yankPrevRegion(opt){
    var buffer = opt.buffer;
    buffer.yankPrevRegion();
  };

  function moveToPreMark(opt){
    var buffer = opt.buffer;
    buffer.moveToPreMark();
  }

  function backspace(opt){
    var buffer = opt.buffer;
    buffer.backspace();
  }

  function deleteChar(opt){
    var buffer = opt.buffer;
    buffer.delete();
  }

  function undo(opt){
    var buffer = opt.buffer;
    buffer.undo();
  }

  function redo(opt){
    var buffer = opt.buffer;
    buffer.redo();
  }

  function prepareCursorOperationHandler(){
    keyEventMap['C-b'] = keyEventMap['Left'] = 'moveBack';
    commands.moveBack = function(opt){
      var buffer = opt.buffer;
      buffer.moveCursorHorizontally(-1);
    };
    keyEventMap['C-f'] = keyEventMap['Right'] = 'moveForward';
    commands.moveForward = function(opt){
      var buffer = opt.buffer;
      buffer.moveCursorHorizontally(+1);
    };
    keyEventMap['C-p'] = keyEventMap['Up'] = 'movePreviousLine';
    commands.movePreviousLine = function(opt){
      var buffer = opt.buffer;
      buffer.moveCursorVertically(-1);
    };
    keyEventMap['C-n'] = keyEventMap['Down'] = 'moveNextLine';
    commands.moveNextLine = function(opt){
      var buffer = opt.buffer;
      buffer.moveCursorVertically(+1);
    };
    keyEventMap['C-a'] = keyEventMap['Home'] = 'moveBOL';
    commands.moveBOL = function(opt){
      var buffer = opt.buffer;
      buffer.moveCursorToBOL();
    };
    keyEventMap['C-e'] = keyEventMap['End'] = 'moveEOL';
    commands.moveEOL = function(opt){
      var buffer = opt.buffer;
      buffer.moveCursorToEOL();
    };
  }
}

function Gmacs(){
}

Gmacs.modes = {};

function Buffer(selector){
  this.init.apply(this, arguments);
};
Gmacs.Buffer = Buffer;

function generate_uuid(){
  return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4() +S4());
  function S4 () {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  }
}


Buffer.prototype.clear = function(){
  var $e = this.$buffer;
  $('.line:eq(0)', $e).nextAll().remove().andSelf().children('span.char').remove();
  // console.log('clear');
};

Buffer.prototype.initHtml = function(uuid){
  return '<div id="BOF_'+uuid+'" class="BOF"></div><div class="line current"><span class="cursor" id="cursor_'+uuid+'"></span></div><div id="EOF_'+uuid+'" class="EOF"></div>';
};

Buffer.prototype.reset = function(){
  var uuid = this.uuid;
  var $e = this.$buffer;
  $e.html(this.initHtml(uuid));
  this.uuid = uuid;
  var $c = $('#cursor_' + uuid);
  this.$c = $c;
  this.$BOF = $('#BOF_' + uuid);
  this.$EOF = $('#EOF_' + uuid);
  this.cursorX = -1;
  this.enabled = true;

  this.eventHandlers = {};
  var self = this;

      this.addEventListner('cursor_moved', function(event){
        self.scrollToCursor(event.row || 0);
      });
  this.fireEvent('cursor_moved', {row:-1});
  this.markRing = new Ring(16);
  //this.scrollToCursor(-1);
  this.visibleMarkMode = true;
  this.commandHistory = new LinkedList(16);
  this.commandHistory.push({o:null,c:null,p:null});
  this.mode_name = this.defaultModeName;
  this.mode_stack = [Gmacs.modes[this.mode_name]];
};

Buffer.prototype.markSet = function(){
  var $c = this.$c;
  if($c.prev().hasClass('mark')){
    // nothing to do here now
  } else {
    var $preMark = this.markRing.top();
    $preMark && $preMark.removeClass('latest');
    var $mark = null;
    if(this.visibleMarkMode){
      $mark = $('<span class="mark visible latest"></span>');
    } else {
      $mark = $('<span class="mark latest"></span>');
    }
    $c.before($mark);
    this.$latestMark = $mark;
    var $pop = this.markRing.push($mark);
    if($pop){
      $pop.remove();
    }
  }
};

Buffer.prototype.region = function($mark){
  var $c = this.$c;
  var curPos = this.getCursorPosition();
  var markPos = this.getCursorPosition($mark);
  var same_row = curPos.row == markPos.row;
  var $region = null;
  var $former = null;
  var $latter = null;
  var $marks_in_region = null;
  if(same_row){
    if(curPos.column == markPos.column){
      return null; // nothing to do here
    } else if(markPos.column < curPos.column){
      $former = $mark;
      $region = $mark.nextUntil($c, ':not(span.mark)');
      $marks_in_region = $mark.nextUntil($c, 'span.mark');
    } else {
      $former = $c;
      $region = $c.nextUntil($mark, ':not(span.mark)');
      $marks_in_region = $c.nextUntil($mark, 'span.mark');
    }
  } else {
    if(markPos.row < curPos.row){
      $former = $mark;
      $latter = $c;
    } else {
      $former = $c;
      $latter = $mark;
    }
    var $firstLine = $former.nextAll(':not(span.mark)');
    var $marks_in_firstLine = $former.nextAll('span.mark');
    var $lines = $former.parent('.line').nextUntil($latter.parent('.line'), '.line');
    var $marks_in_lines = $('span.mark', $lines);
    var $lastLine = $latter.prevAll(':not(span.mark)');
    var $marks_in_lastLine = $latter.prevAll('span.mark');
    $region =$($.makeArray($firstLine)
               .concat($.makeArray($lines))
               .concat($.makeArray($lastLine).reverse()));
    $marks_in_region =$($.makeArray($marks_in_firstLine)
                        .concat($.makeArray($marks_in_lines))
                        .concat($.makeArray($marks_in_lastLine).reverse()));
  }
  return {$former: $former, $latter: $latter,
          $region: $region, $marks_in_region: $marks_in_region,
          curPos: curPos, markPos: markPos,
          same_row: same_row
         };
};


Buffer.prototype.copyRegion = copy_cut_func_gen(false);
Buffer.prototype.cutRegion = copy_cut_func_gen(true);
function copy_cut_func_gen(cut_option){
  return function(){
    var $c = this.$c;
    // var $mark = this.markRing.top();
    var $mark = this.$latestMark;
    var ret = this.region($mark);
    var curPos = ret.curPos;
    var markPos = ret.markPos;
    var $region = ret.$region;
    var $former = ret.$former;
    var $latter = ret.$latter;
    var $marks_in_region = ret.$marks_in_region;
    var same_row = ret.same_row;
    
    // this.killRing.push($region);
		this.killRing.push({region:$region, text:$region.text()});
    if(cut_option){
      $former.before($marks_in_region);
      // $region.remove();
      if($former.hasClass('mark')){
        this.swapMarkAndCursor();
      }
      while(!$c.next().hasClass('mark')){
        this.delete();
      }
      // if($former != null && $latter != null){
      //   var $latterParent = $latter.parent('.line');
      //   var $latterNextAll = $latter.nextAll();
      //   $former.parent('.line').append($latter).append($latterNextAll);
      //   $latterParent.remove();
      // }
      if($latter == $c){
        var motion = {row: 0, column: 0};
        if(same_row){
          motion.column = -1;
        } else {
          motion.column = curPos.column == markPos.column ? 0 : (curPos.column > markPos.column ? 1: -1);
          motion.row = -1;
        }
        this.fireEvent('cursor_moved', motion);
      }
      this.fireEvent('modified_text', {buffer:this, removedChar:$region.text(), position:this.getCursorPosition() });
    }
    
  };
}

Buffer.prototype.yankRegion = function(){
  var $c = this.$c;
	
  // var $region = this.killRing.top();
  // var text = $region.text();
	var regionInfo = this.killRing.top();
	var $region = regionInfo.region;
	var text = regionInfo.text;
	
  var self = this;
  var $BOY = $('<span class="BOY"></span>');
  $c.before($BOY);
  text.split('').forEach(function(c){self.insertChar(c);});
  this.$BOY = $BOY;
  var buffer = this;
  var func = function(e){
    // console.log('in command_executed event handler:');
    // console.log(e.command);
    if(e.command != 'yankRegion' && e.command != 'yankPrevRegion'){
      if(buffer.$BOY){
        buffer.$BOY.remove();
        delete buffer.$BOY;
      }
      buffer.removeEventListner('command_executed', func);
    }
  };
  this.addEventListner('command_executed',func);
  // TODO:fire event
};

Buffer.prototype.yankPrevRegion = function(){
  var $c = this.$c;
  var $mark = this.$BOY;
  if($mark == null){
    mb && mb.insertText('Previous command was not a yank.');
    return;
  }
  this.killRing.next();
  // var $region_next = this.killRing.top();
	var regionNextInfo = this.killRing.top();
	var $region_next = regionNextInfo.region
  if($region_next){
    var ret = this.region($mark);
    var $yanked_region = ret.$region;
    $yanked_region.remove();
    // var text = $region_next.text();
		var text = regionNextInfo.text;
    $mark.after($c);
    var self = this;
    text.split('').forEach(function(c){self.insertChar(c);});
  }

  // TODO:fire event
};

Buffer.prototype.moveCursorAt = function(pos){
  if(typeof pos != 'number')return;
  var $c = this.$c;
  var $chars = $($('span.char', this.$buffer));
  if($chars.length > pos){
    var $char = $($chars.get(pos));
    $char.before($c);
  } else if($chars.length == pos){
    $chars.last().after($c);
    while($c.next().hasClass('mark')){
      $c.next().after($c);
    }
  } 

  
};

Buffer.prototype.moveToPreMark = function(){
  // console.log(this.markRing);
  var $c = this.$c;
  var $mark = this.markRing.next();
  if($mark == null){
    return; // nothing to do here now
  }
  $mark.after($c);
  var mark_pos = this.getCursorPosition($mark);
  var cur_pos = this.getCursorPosition();
  var rowI = mark_pos.row - cur_pos.row;
  rowI = rowI > 0 ? 1 : (rowI < 0 ? -1 : 0);
  var colI = mark_pos.column - cur_pos.column;
  colI = colI > 0 ? 1 : (colI < 0 ? -1 : 0);
  this.fireEvent('cursor_moved', {row: rowI, column: colI});
};

Buffer.prototype.swapMarkAndCursor = function(){
  var $c = this.$c;
  var $mark = this.markRing.next();
  if($mark == null){
    return; // nothing to do here now
  }
  var $prev = $c.prev();
  $mark.after($c);
  $prev.after($mark);
  var mark_pos = this.getCursorPosition($mark);
  var cur_pos = this.getCursorPosition();
  var rowI = mark_pos.row - cur_pos.row;
  rowI = rowI > 0 ? 1 : (rowI < 0 ? -1 : 0);
  var colI = mark_pos.column - cur_pos.column;
  colI = colI > 0 ? 1 : (colI < 0 ? -1 : 0);
  this.fireEvent('cursor_moved', {row: rowI, column: colI});
  
};

Buffer.prototype.removeEventListner = function(event_type, handler){
  var handlers = this.eventHandlers[event_type];
  var handlerIndex = this.eventHandlersIndex[event_type];
  var index = handlerIndex[handler];
  if(index){
    handlers.splice(index, 1);
  }
  
};

Buffer.prototype.addEventListner = function(event_type, handler){
  // white list check should be needed for event_type
  if(this.eventHandlers[event_type] == null){
    this.eventHandlers[event_type] = [];
  }
  if(this.eventHandlersIndex == null){
    this.eventHandlersIndex = {};
  }
  if(this.eventHandlersIndex[event_type] == null){
    this.eventHandlersIndex[event_type] = {};
  }
  this.eventHandlers[event_type].push(handler);
  this.eventHandlersIndex[event_type][handler] = this.eventHandlers[event_type].length - 1;
};
Buffer.prototype.fireEvent = function(event_type, event){
  var handlers = this.eventHandlers[event_type];
  if(handlers){
    this.eventHandlers[event_type].forEach(function(handler){
      handler(event);
    });
  }
};

Buffer.prototype.init = function(selector, killRing, defaultModeName){
  this.$buffer = $(selector);
  this.uuid = generate_uuid();
  this.killRing = killRing;
  this.active = false;
  this.defaultModeName = defaultModeName || 'default';
  this.reset();
  if(Buffer.buffers == null){
    Buffer.buffers = [];
  }
  Buffer.buffers.push(this);
};


Buffer.prototype.setActive = function(active){
  this.active = active;
  if(active){
    Gmacs.buffer = this;
    var curBuf = this;
    Buffer.buffers.forEach(function(buffer){
      if(buffer != curBuf){
        buffer.setActive(false);
      }
    });
  }
  var buffer = this;
  var $c = this.$c;
  var opa = 1;
  function cursor_anime(){
    if(buffer.active){
      $c.css('visibility', 'visible');
      $c.animate({opacity: (opa = 1 - opa)}, 400, cursor_anime);
    } else {
      $c.css('visibility', 'hidden');
    }
  }
  cursor_anime();
};


Buffer.prototype.insertLineDelimiterCore = function(){
  var pos = this.getCursorPosition();
  var $c = this.$c;
  var next = $c.before('<span class="char line_delimiter"><br />\n</span>')
    .parent('.line').removeClass('current')
    .after('<div class="line current"></div>')
    .next('.line')
    //.append($('span.cursor, span.cursor ~ span.char, span.cursor ~ span.mark'));
    .append($($.makeArray($c).concat($.makeArray($c.nextAll('span.char, span.mark')))));
  
  this.fireEvent('cursor_moved', {buffer:this,row:+1, col:-1});
  this.fireEvent('modified_text', {buffer:this, insertedChar:'\n', position:pos});
};

Buffer.prototype.insertLineDelimiter = function(){
  if(!this.enabled) return;
  var count = this.count();
  this.insertLineDelimiterCore();
  this.commandHistory.push({o:'w', c:'\n', p: count});
  // console.log(this.commandHistory);
  
};

Buffer.prototype.count = function($c){
  if($c == null){
    $c = this.$c;
  }
  var $prevChar = $c.prevAll('span.char').first();
  if($prevChar.length == 0){
    var $preLine = $c.parent('.line').prev('.line');
    if($preLine.length > 0){
      $prevChar = $preLine.children('span.char').last();
    } else {
      // very begining
      return 0;
    }
  }
  return $('span.char', this.$buffer).index($prevChar)+1;
};

Buffer.prototype.insertText = function(text){
  var self = this;
  text.split('').forEach(function(c){self.insertChar(c);});
};

Buffer.prototype.insertCharCore = function(c){
  var $c = this.$c;
  this.cursorX = -1;
  if(c == (this.lineDelimiter || '\n')){
    this.insertLineDelimiterCore();
  } else {
    var pos = this.getCursorPosition();
    if(c == ' '){
      $c.before('<span class="char normal space">&nbsp;</span>');
    } else {
      $c.before('<span class="char normal"></span>')
        .prev().text(c);
    }
    this.fireEvent('cursor_moved', {buffer:this, row:0, col:+1});
    this.fireEvent('modified_text', {buffer:this, insertedChar:c, position:pos});
  }
};

Buffer.prototype.insertChar = function(c){
  if(!this.enabled) return;
  if(c == (this.lineDelimiter || '\n')){
    this.insertLineDelimiter();
    return;
  }
  var count = this.count();
  this.insertCharCore(c);
  this.commandHistory.push({o:'w', c:c, p: count});
  // console.log(this.commandHistory);
};
Buffer.prototype.backspace = function(){
  if(!this.enabled) return;
  var $c = this.$c;
  var c = null;
  var count = this.count();
  this.cursorX = -1;
  var $prev = $c.prevAll('span.char.normal').first();
  var pos = this.getCursorPosition();
  if($prev.length == 0){
    var $line = $c.parent('.line');
    var $preLine = $line.prev('.line');
    if($preLine.length > 0){
      c = '\n';
      $('span.char.line_delimiter', $preLine).remove();
      $preLine.addClass('current');
      $preLine.append($line.children());
      $line.remove();
      this.fireEvent('cursor_moved', {row:-1, col:+1});
      this.fireEvent('modified_text', {buffer:this, removedChar:'\n', position:pos});
    }
  } else {
    c = $prev.text();
    $prev.remove();
    this.fireEvent('cursor_moved', {row:0, col:-1});
    this.fireEvent('modified_text', {buffer:this, removedChar:c, position:pos});
  }
  this.commandHistory.push({o:'d', c:c, p: count-1});
};

Buffer.prototype.deleteCore = function(){
  var $c = this.$c;
  var c = null;
  this.cursorX = -1;
  var $next = $c.nextAll('span.char.normal').first();
  var pos = this.getCursorPosition();
  if($next.length == 0){
    var $line = $c.parent('.line');
    var $nextLine = $line.next('.line');
    if($nextLine.length > 0){
      c = '\n';
      $('span.char.line_delimiter', $line).remove();
      $line.append($nextLine.children());
      $nextLine.remove();
      this.fireEvent('modified_text', {buffer:this, removedChar:'\n', position:pos});
    }
  } else {
    c = $next.text();
    $next.remove();
    this.fireEvent('modified_text', {buffer:this, removedChar:c, position:pos});
  }
  return c;
};

Buffer.prototype.delete = function(){
  if(!this.enabled) return;
  var count = this.count();
  var c = this.deleteCore();
  this.commandHistory.push({o:'d', c:c, p: count});
};

Buffer.prototype.moveCursorToBOL = function(){
  if(!this.enabled) return;
  var $c = this.$c;
  this.cursorX = -1;
  var $line = $c.parent('.line');
  $('span.char.normal', $line).first().before($c);
  while($c.next().hasClass('mark')){
    $c.next().after($c);
  }
  this.fireEvent('cursor_moved', {buffer:this, row:0, col:-1});
};

Buffer.prototype.moveCursorToEOL = function(){
  if(!this.enabled) return;
  var $c = this.$c;
  this.cursorX = -1;
  var $line = $c.parent('.line');
  $('span.char.normal', $line).last().after($c);
  while($c.next().hasClass('mark')){
    $c.next().after($c);
  }
  this.fireEvent('cursor_moved', {buffer:this, row:0, col:+1});
};


Buffer.prototype.moveCursorHorizontally = function(n){
  // console.log(this);
  // console.log(this.$c);
  if(!this.enabled) return;
  var $c = this.$c;
  this.cursorX = -1;
  var $line = $c.parent('.line');
  //var up_or_down = 0;
  if(n<0){
    var $prev = $c.prevAll('span.char').first();
    if($prev.length > 0){
      $prev.before($c);
      this.fireEvent('cursor_moved', {buffer:this, row:0, col:-1});
    } else {
      var $preLine = $line.prev('.line');
      if($preLine.length > 0){
        var $chars = $('span.char.normal', $preLine);
        if($chars.length > 0){
          $chars.last().after($c);
        } else {
          $preLine.prepend($c);
        }
        while($c.next().hasClass('mark')){
          $c.next().after($c);
        }
        $line.removeClass('current');
        $preLine.addClass('current');
        //up_or_down = -1;
        this.fireEvent('cursor_moved', {buffer:this, row:-1, col:-1});
      }
    }
  } else if(n>0){
    var $next = $c.nextAll('span.char.normal').first();
    if($next.length > 0){
      $next.after($c);
      while($c.next().hasClass('mark')){
        $c.next().after($c);
      }
      this.fireEvent('cursor_moved', {buffer:this, row:0, col:+1});
    } else {
      var $nextLine = $line.next('.line');
      if($nextLine.length > 0){
        $nextLine.prepend($c);
        while($c.next().hasClass('mark')){
          $c.next().after($c);
        }
        $line.removeClass('current');
        $nextLine.addClass('current');
        //up_or_down = +1;
        this.fireEvent('cursor_moved', {buffer:this, row:+1, col:-1});
      }
    }
  }
  // this.scrollToCursor(up_or_down);
  // this.fireEvent('cursor_moved', {row: up_or_down});

};

Buffer.prototype.scrollToCursor = function(up_or_down){
  // up : -1
  // down : +1
  var $c = this.$c;
  if(up_or_down != -1 && up_or_down != 1){
    return;
  }
  var $line = $c.parent('.line');
  var line_height = $line.height() + h('margin-top') + h('border-top') + h('padding-top')
    + h('margin-bottom') + h('border-bottom') + h('padding-bottom');
  
  var top = $c.offset().top - (up_or_down > 0 ? window.innerHeight : 0)
    + (up_or_down > 0 ? 1 : -1) * line_height * 3 + (up_or_down > 0 ? ($status.height() + $mb.height()) : 0);
  // TODO: number 3 above should be customizable

  var current_top = $d.scrollTop();
  if(up_or_down > 0 && top > current_top ||
     up_or_down < 0 && top < current_top ){
    $body.animate({scrollTop: top}, 10);
  }

  function h(k){
    var sv = $line.css(k);
    var match = (sv||'').match(/^\d+/);
    var v = match ? match[0] : 0;
    return v|0;
  }
};

Buffer.prototype.moveCursorVertically = function(n){
  if(!this.enabled) return;
  var $c = this.$c;
  var $line = $c.parent('.line');
  if(this.cursorX < 0){
    this.cursorX = $c.prevAll('span.char.normal').length;
  }
  // console.log(cursorX);
  var $targetLine = null;
  if(n<0){
    $targetLine = $line.prev('.line');
  } else {
    $targetLine = $line.next('.line');
  }
  if($targetLine.length > 0){
    var $targetLineChars = $('span.char.normal', $targetLine);
    if(this.cursorX == 0 || $targetLineChars.length == 0){
      $targetLine.prepend($c);
      this.fireEvent('cursor_moved', {buffer:this, row:n, col:-1});
  } else {
    if($targetLineChars.length >= this.cursorX){
      $($targetLineChars.get(this.cursorX-1)).after($c);
      this.fireEvent('cursor_moved', {buffer:this, row:n, col:0});
    } else {
      $targetLineChars.last().after($c);
      this.fireEvent('cursor_moved', {buffer:this, row:n, col:-1});
    }
  }
    $line.removeClass('current');
    $targetLine.addClass('current');
    // this.scrollToCursor(n);
    // this.fireEvent('cursor_moved', {row: n});
    
  }        
};
Buffer.prototype.lineDelimiter = '\n';

Buffer.prototype.getCursorPosition = function($target){
  var $c = $target == null ? this.$c : $target;
  var column = $c.prevAll('span.char.normal').length;
  var row = $c.parent('.line').prevAll('.line').length + 1;
  return {row: row, column: column};
};

Buffer.prototype.undo = function(){
  var command = this.commandHistory.cur();
  // console.log(command);
  if(command == null){
    return;
  }
  var operation = command.o;
  if(operation != 'w' && operation != 'd'){
    return;
  }
  this.commandHistory.prev();
  if(command.p >= 0){
    this.moveCursorAt(command.p);
    if(operation == 'w'){
      this.deleteCore();
    } else if(operation == 'd'){
      this.insertCharCore(command.c);
    }
  }
};

Buffer.prototype.redo = function(){
  if(!this.commandHistory.next()){
    return;
  }
  var command = this.commandHistory.cur();
  // console.log(command);
  if(command == null){
    return;
  }
  var operation = command.o;
  if(operation != 'w' && operation != 'd'){
    return;
  }
  if(command.p >= 0){
    this.moveCursorAt(command.p);
    if(operation == 'd'){
      this.deleteCore();
    } else if(operation == 'w'){
      this.insertCharCore(command.c);
    }
  }
};


var vkCodeMap = {
  8: 'Backspace',
  9: 'Tab',
  13: 'Enter',
  16: 'Shift',
  17: 'Control',
  18: 'Alt',
  20: 'CapsLock',
  27: 'Esc',
  32: ' ',
  33: 'PageUp',
  34: 'PageDown',
  35: 'End',
  36: 'Home',
  37: 'Left',
  38: 'Up',
  39: 'Right',
  40: 'Down',
  46: 'Del'
};


function keyMap(code){
  // console.log("code:" + code);
  var char = String.fromCharCode(code);
  if(32 <= code && code <= 126){
    ret = char;
  } else {
    ret = vkCodeMap[code];
  }
  return ret;
}   


function Ring(size){
  this.init.apply(this, arguments);
};

Ring.prototype.init = function(size){
  this.size = size;
  this.cur = null;
  this.count = 0;
};

Ring.prototype.push = function(x){
  var pop = null;
  if(this.cur == null){
    this.root = this.cur = {};
    this.cur.next = this.cur.prev = this.cur;
    this.count++;
  } else if(this.count >= this.size){
    pop = this.cur.next.value;
    this.cur = this.cur.next;
  } else {
    this.cur.next = {prev: this.cur, next: this.cur.next};
    this.cur.next.next.prev = this.cur.next;
    this.cur = this.cur.next;
    this.count++;
  }
  this.cur.value = x;
  return pop;
};

Ring.prototype.top = function(){
  return this.cur == null ? null : this.cur.value;
};

Ring.prototype.next = function(){
  if(this.cur == null){
    return null;
  }
  var ret = this.cur.value;
  this.cur = this.cur.prev;
  return ret;
};

function LinkedList(size){
  this.init.apply(this, arguments);
}

LinkedList.prototype.init = function(size){
  this.position = -1;
  this.current = null;
  this.root = null;
  this.end = null;
  this.size = size;
  this.count = 0;
};

LinkedList.prototype.push = function(v){
  var element = {value: v, prev: null, next: null};
  if(this.current == null){
    this.root = this.end = this.current = element;
  } else {
    this.end = this.current.next = element;
    element.prev = this.current;
    this.current = element;
  }
  this.position++;
  this.count = this.position + 1;
  if(this.count > this.size){
    // this.root = this.root.next;
    // this.root.prev = null;
    this.root.next = this.root.next.next;
    this.root.next.prev = this.root;
    this.position--;
    this.count--;
  }
};

LinkedList.prototype.prev = function(){
  var ret = false;
  var element = this.current;
  if(element == null){
    // nothing to do here
  } else {
    var prev = element.prev;
    if(prev == null){
      // nothing to do here
    } else {
      this.current = prev;
      this.position--;
      ret = true;
    }
  }
  return ret;
};

LinkedList.prototype.next = function(){
  var ret = false;
  var element = this.current;
  if(element == null){
    // nothing to do here
  } else {
    var next = element.next;
    if(next == null){
      // nothing to do here
    } else {
      this.current = next;
      this.position++;
      ret = true;
    }
  }
  return ret;
};

LinkedList.prototype.cur = function(){
  var element = this.current;
  if(element == null){
    return null;
  }
  return element.value;
};


var ipc = require('ipc');
var holder = document.body;
holder.ondragover = function () {
    return false;
};
holder.ondragleave = holder.ondragend = function () {
    return false;
};
holder.ondrop = function (e) {
    e.preventDefault();
    var file = e.dataTransfer.files[0];
    ipc.send('asynchronous-message', file.path);
    return false;
  };
ipc.on('asynchronous-reply', function(fileContents) {
		Gmacs.buffer.insertText(fileContents);
});


module.exports = Gmacs;
