$(function(){
  var keyEventMap = {};
  var buffer = new Buffer();
  var $d = $(document);
  var $e = $('#editor');
  var $c = $('#cursor');
  var $BOF = $('#BOF');
  var $EOF = $('#EOF');
  var BOF = $BOF[0];
  var EOF = $EOF[0];

  var keyDownHit = false;
  var cursorX = -1;

  prepareKeyEventMap();
  
  function invokeHandler(input){
    var func = keyEventMap[input];
    if(func){
      func({buffer:buffer});
    }
  }

  $d.keypress(function(e){
    var mod = (e.altKey ? 'A' : '') + (e.shiftKey ? 'S' : '') + (e.metaKey ? 'M' : '') + (e.ctrlKey ? 'C' : '');
    if(!keyDownHit || mod){
      var input = (mod ? mod + '-' : '') + String.fromCharCode(e.charCode);
      if(input){
        // console.log(input);
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        invokeHandler(input);
      }
    }
    keyDownHit = false;
  }).keydown(function(e){
    var input = vkCodeMap[e.keyCode];
    // console.log('keydown: ' + input);
    if(input){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      var func = keyEventMap[input];
      if(func){
        func({buffer:buffer});
      } else {
        keyDownHit = true;
      }
    }
  });
  
  function prepareKeyEventMap(){
    prepareBasicKeyInputHandler();
    prepareCursorOperationHandler();

    
    function prepareBasicKeyInputHandler(){
      for(var code=32;code <= 126; code++){
        var char = String.fromCharCode(code);
        // console.log(char);
        var handler = generateKeyInputHandler(char);
        keyEventMap[char] = handler;
        keyEventMap['S-' + char] = handler;
      }
      keyEventMap['Enter'] = generateKeyInputHandler(buffer.lineDelimiter || '\n');
      keyEventMap['Backspace'] = backspace;
    }

    function generateKeyInputHandler(char){
      return function(opt){
        // console.log('#' + char + '#');
        var buffer = opt.buffer;
        buffer.insertChar(char);
      };
    }

    function backspace(opt){
      var buffer = opt.buffer;
      buffer.backspace();
    }

    function prepareCursorOperationHandler(){
      keyEventMap['Left'] = function(opt){
        var buffer = opt.buffer;
        buffer.moveCursorHorizontally(-1);
      };
      keyEventMap['Right'] = function(opt){
        var buffer = opt.buffer;
        buffer.moveCursorHorizontally(+1);
      };
      keyEventMap['Up'] = function(opt){
        var buffer = opt.buffer;
        buffer.moveCursorVertically(-1);
      };
      keyEventMap['Down'] = function(opt){
        var buffer = opt.buffer;
        buffer.moveCursorVertically(+1);
      };
    }
    
  }



  function Buffer(){};

  Buffer.prototype.insertLineDelimiter = function(){
    var next = $c.before('<div class="char line_delimiter"><br /></div>')
      .parent('div.line').removeClass('current')
      .after('<div class="line current"></div>')
      .next('div.line')
      .append($('~ div.char', $c))
      .append($c);
  };

  Buffer.prototype.insertChar = function(c){
    cursorX = -1;
    if(c == (this.lineDelimiter || '\n')){
      this.insertLineDelimiter();
    } else {
      if(c == ' '){
        $c.before('<div class="char normal space">&nbsp;</div>');
      } else {
        $c.before('<div class="char normal"></div>')
          .prev().text(c);
      }
    }
  };
  Buffer.prototype.backspace = function(){
    cursorX = -1;
    var $prev = $c.prev('div.char.normal');
    if($prev.length == 0){
      var $line = $c.parent('div.line');
      var $preLine = $line.prev('div.line');
      if($preLine.length > 0){
        $('div.char.line_delimiter', $preLine).remove();
        $preLine.addClass('current');
        $preLine.append($c);
        $line.remove();
      }
    } else {
      $prev.remove();
    }
  };
  Buffer.prototype.moveCursorHorizontally = function(n){
    cursorX = -1;
    var $line = $c.parent('div.line');
    if(n<0){
      var $prev = $c.prev('div.char');
      if($prev.length > 0){
        $c.prev().before($c);
      } else {
        var $preLine = $line.prev('div.line');
        if($preLine.length > 0){
          var $chars = $('div.char.normal', $preLine);
          if($chars.length > 0){
            $chars.last().after($c);
          } else {
            $preLine.prepend($c);
          }
          $line.removeClass('current');
          $preLine.addClass('current');
        }
      }
    } else if(n>0){
      var $next = $c.next('div.char.normal');
      if($next.length > 0){
        $c.next().after($c);
      } else {
        var $nextLine = $line.next('div.line');
        if($nextLine.length > 0){
          $nextLine.prepend($c);
          $line.removeClass('current');
          $nextLine.addClass('current');
        }
      }
    }
  };

  Buffer.prototype.moveCursorVertically = function(n){
    var $line = $c.parent('div.line');
    if(cursorX < 0){
      cursorX = $c.prevAll('div.char.normal').length;
    }
    console.log(cursorX);
    var $targetLine = null;
    if(n<0){
      $targetLine = $line.prev('div.line');
    } else {
      $targetLine = $line.next('div.line');
    }
    if($targetLine.length > 0){
      var $targetLineChars = $('div.char.normal', $targetLine);
      if(cursorX == 0 || $targetLineChars.length == 0){
        $targetLine.prepend($c);
      } else {
        if($targetLineChars.length >= cursorX){
          $($targetLineChars.get(cursorX-1)).after($c);
        } else {
          $targetLineChars.last().after($c);
        }
      }
      $line.removeClass('current');
      $targetLine.addClass('current');
    }        
  };
  Buffer.prototype.lineDelimiter = '\n';


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
});
