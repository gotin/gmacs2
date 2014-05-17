var $input = $('#input');
var input = $input.get(0);
var $d = $(document);
var $footer = $('#footer');
var $body = $('html,body');
$(function(){
  $input.val('');
  var ime = false;
  input.focus();
  $input.blur(function(){input.focus();}).focusout(function(){input.focus();});
  setInterval(function(){$('#input:focus').length == 0 && input.focus();}, 100);
  var keyEventMap = {};
  var commands = {};
  var modes = {default: {keyEventMap: keyEventMap, commands: commands}};
  var current_mode = modes.default;
  var killRing = new Ring(16);
  var buffers = {'*scratch*' : new Buffer('#editor', killRing)};
  var current_buffer_title = '*scratch*';
  var buffer = buffers[current_buffer_title];


  var past_input = null;
  var keyDown = null;
  var keyDownHit = false;

  prepareKeyEventMap();

  function invokeHandler(input){
    if(past_input != null){
      past_input = input = past_input + input;
      $footer.text(past_input);
    }
    var command = keyEventMap[input];
    var func = commands[command];
    if(func){
      // buffer.commandHistory.push(command);
      var status = func({buffer:buffer});
      buffer.fireEvent('command_executed', {buffer:buffer, command:command});
      var pos = buffer.getCursorPosition();
      $footer.text('(' + pos.row+','+pos.column+')');
      if(typeof status != 'object' || !('keepPastInput' in status) || !status.keepPastInput){
        past_input = null;
      }
    } else {
      $footer.text('');
      past_input = null;
    }
  }

  $d.bind('compositionstart', function(e){
    ime = true;
    $input.css(buffer.$c.position());
    $input.css('z-index', '100');
  }).bind('compositionend', function(e){
    
    var timer = setInterval(function(){
      if(!ime){
        $input.val().split('').forEach(function(c){buffer.insertChar(c);});
        $input.val('');
        clearInterval(timer);
        $input.css('z-index', '1');
        var pos = buffer.getCursorPosition();
        $footer.text('(' + pos.row+','+pos.column+')');
      }
    },10);
    ime = false;
  });;

  $d.keypress(function(e){
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
      if(input){
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
    var mod = (e.altKey ? 'A' : '') + (e.shiftKey ? 'S' : '') + (e.metaKey ? 'M' : '') + (e.ctrlKey ? 'C' : '');
    keyDown = e.keyCode;

    var input = null;
    if(mod.match(/(A|M|C){1,3}/)){
      input = mod + '-' + String.fromCharCode(keyDown).toLowerCase();
      keyDown = null;
    } else {
      input = vkCodeMap[keyDown];
    }
    // console.log('keydown: ' + keyDown);

    if(input){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if(past_input){
        input = past_input + input;
      }
      var command = keyEventMap[input];
      var func = commands[command];
      if(func){
        // buffer.commandHistory.push(command);
        var status = func({buffer:buffer});
        buffer.fireEvent('command_executed', {buffer:buffer, command:command});
        var pos = buffer.getCursorPosition();
        $footer.text('(' + pos.row+','+pos.column+')');
        if(typeof status != 'object' || !('keepPastInput' in status) || !status.keepPastInput){
          past_input = null;
        }
      } else {
        keyDownHit = !!keyDown;
      }
    }
  });
  
  function prepareKeyEventMap(){
    prepareBasicKeyInputHandler();
    prepareCursorOperationHandler();
    prepareCombinationSequences();
    prepareMarkOperations();

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
      var insertLineDelimiter = generateKeyInputHandler(buffer.lineDelimiter || '\n');
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
        if(past_input != null){
          past_input += sequence;
        } else {
          past_input = sequence;
        }
        $footer.text(past_input);
        // console.log(past_input);
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




});

function Buffer(selector){
  this.init.apply(this, arguments);
};

function generate_uuid(){
  return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4() +S4());
  function S4 () {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  }
}

Buffer.prototype.reset = function(){
  var uuid = this.uuid;
  var $e = this.$editor;
  $e.html('<div id="BOF_'+uuid+'" class="BOF"></div><div class="line current"><span class="cursor" id="cursor_'+uuid+'"></span></div><div id="EOF_'+uuid+'" class="EOF"></div>');
  this.uuid = uuid;
  var $c = $('#cursor_' + uuid);
  this.$c = $c;
  var opa = 1;
  function cursor_anime(){
    $c.animate({opacity: (opa = 1 - opa)}, 400, cursor_anime);
  }
  cursor_anime();
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
  this.commandHistory = [];
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
    this.markRing.push($mark);
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
    var $lines = $former.parent('div.line').nextUntil($latter.parent('div.line'), 'div.line');
    var $marks_in_lines = $('span.mark', $lines);
    var $lastLine = $latter.prevAll(':not(span.mark)');
    var $marks_in_lastLine = $latter.prevAll('span.mark');
    $region =$($.makeArray($firstLine)
               .concat($.makeArray($lines))
               .concat($.makeArray($lastLine)));
    $marks_in_region =$($.makeArray($marks_in_firstLine)
                        .concat($.makeArray($marks_in_lines))
                        .concat($.makeArray($marks_in_lastLine)));
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
    
    this.killRing.push($region);
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
      //   var $latterParent = $latter.parent('div.line');
      //   var $latterNextAll = $latter.nextAll();
      //   $former.parent('div.line').append($latter).append($latterNextAll);
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
  var $region = this.killRing.top();
  var text = $region.text();
  var self = this;
  var $BOY = $('<span class="BOY"></span>');
  $c.before($BOY);
  text.split('').forEach(function(c){self.insertChar(c);});
  this.$BOY = $BOY;
  var buffer = this;
  var func = function(e){
    console.log('in command_executed event handler:');
    console.log(e.command);
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
  console.log($mark);
  if($mark == null){
    $footer.text('Previous command was not a yank.');
    return;
  }
  this.killRing.next();
  var $region_next = this.killRing.top();
  if($region_next){
    var ret = this.region($mark);
    var $yanked_region = ret.$region;
    $yanked_region.remove();
    var text = $region_next.text();
    $mark.after($c);
    var self = this;
    text.split('').forEach(function(c){self.insertChar(c);});
  }

  // TODO:fire event
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

Buffer.prototype.init = function(selector, killRing){
  this.$editor = $(selector);
  this.uuid = generate_uuid();
  this.killRing = killRing;
  this.reset();
};


Buffer.prototype.insertLineDelimiter = function(){
  if(!this.enabled) return;
  var pos = this.getCursorPosition();
  var $c = this.$c;
  var count = this.count();
  var next = $c.before('<span class="char line_delimiter"><br />\n</span>')
    .parent('div.line').removeClass('current')
    .after('<div class="line current"></div>')
    .next('div.line')
    //.append($('span.cursor, span.cursor ~ span.char, span.cursor ~ span.mark'));
    .append($($.makeArray($c).concat($.makeArray($c.nextAll('span.char, span.mark')))));
  
  this.fireEvent('cursor_moved', {buffer:this,row:+1, col:-1});
  this.fireEvent('modified_text', {buffer:this, insertedChar:'\n', position:pos});
  
  this.commandHistory.push({o:'w', c:'\n', p: count});
  console.log(this.commandHistory);
  
};

Buffer.prototype.count = function($c){
  if($c == null){
    $c = this.$c;
  }
  var $prevChar = $c.prev('span.char');
  if($prevChar.length == 0){
    var $preLine = $c.parent('div.line').prev('div.line');
    if($preLine.length > 0){
      $prevChar = $preLine.children('span.char').last();
    } else {
      // very begining
      return 0;
    }
  }
  return $('span.char', this.$editor).index($prevChar)+1;
};

Buffer.prototype.insertChar = function(c){
  if(!this.enabled) return;
  // console.log(c);
  var $c = this.$c;
  var count = this.count();

  this.cursorX = -1;
  if(c == (this.lineDelimiter || '\n')){
    this.insertLineDelimiter();
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
  this.commandHistory.push({o:'w', c:c, p: count});
  console.log(this.commandHistory);
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
    var $line = $c.parent('div.line');
    var $preLine = $line.prev('div.line');
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

Buffer.prototype.delete = function(){
  if(!this.enabled) return;
  var $c = this.$c;
  var count = this.count();
  var c = null;
  this.cursorX = -1;
  var $next = $c.nextAll('span.char.normal').first();
  var pos = this.getCursorPosition();
  if($next.length == 0){
    var $line = $c.parent('div.line');
    var $nextLine = $line.next('div.line');
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
  this.commandHistory.push({o:'d', c:c, p: count});
};

Buffer.prototype.moveCursorToBOL = function(){
  if(!this.enabled) return;
  var $c = this.$c;
  this.cursorX = -1;
  var $line = $c.parent('div.line');
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
  var $line = $c.parent('div.line');
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
  var $line = $c.parent('div.line');
  //var up_or_down = 0;
  if(n<0){
    var $prev = $c.prevAll('span.char').first();
    if($prev.length > 0){
      $prev.before($c);
      this.fireEvent('cursor_moved', {buffer:this, row:0, col:-1});
    } else {
      var $preLine = $line.prev('div.line');
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
      var $nextLine = $line.next('div.line');
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
  var $line = $c.parent('div.line');
  var line_height = $line.height() + h('margin-top') + h('border-top') + h('padding-top')
    + h('margin-bottom') + h('border-bottom') + h('padding-bottom');
  
  var top = $c.offset().top - (up_or_down > 0 ? window.innerHeight : 0)
    + (up_or_down > 0 ? 1 : -1) * line_height * 3 + (up_or_down > 0 ? $footer.height() : 0);
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
  var $line = $c.parent('div.line');
  if(this.cursorX < 0){
    this.cursorX = $c.prevAll('span.char.normal').length;
  }
  // console.log(cursorX);
  var $targetLine = null;
  if(n<0){
    $targetLine = $line.prev('div.line');
  } else {
    $targetLine = $line.next('div.line');
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
  var row = $c.parent('div.line').prevAll('div.line').length + 1;
  return {row: row, column: column};
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
  if(this.cur == null){
    this.root = this.cur = {};
    this.cur.next = this.cur.prev = this.cur;
    this.count++;
  } else if(this.count >= this.size){
    this.cur = this.cur.next;
  } else {
    this.cur.next = {prev: this.cur, next: this.cur.next};
    this.cur.next.next.prev = this.cur.next;
    this.cur = this.cur.next;
    this.count++;
  }
  this.cur.value = x;
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


