/// <reference path="../build/node_modules/sjcl-typescript-definitions/sjcl/sjcl.d.ts" />
/// <reference path="../build/node_modules/@types/jquery/index.d.ts" />

(() => {
  const CIRKLE_PREFIX = 'supersekrit';

  class Cipher {
    private sekritPatt;

    constructor (private prefix, private suffix, private password) {
      this.sekritPatt = new RegExp(this.prefix + "([A-Za-z0-9_,-]{46,})" + this.suffix);
    }

    private toWebsafe(s) {
      s = s.replace(/\+/g, '-').replace(/\//g, '_');
      return "" + this.prefix + s + this.suffix;
    }

    private fromWebsafe(s) {
      const sekS = this.sekritPatt.exec(s);
      if (sekS === null) {
        throw "Cannot decrypt: expect something of the form \"" + this.prefix + "..." + this.suffix + "\"";
      }
      return sekS[1].replace(/\-/g, '+').replace(/_/g, '/');
    }

    private sekrit2crypt(s) : sjcl.SjclCipherEncrypted {
      const ref = this.fromWebsafe(s).split(',');
      const iv = ref[0];
      const salt = ref[1];
      const ct = ref[2];
      assert(() => iv.length === 22);
      assert(() => salt.length === 11);
      assert(() => ct.length >= 11);
      const result = "{iv:\"" + iv + "\",salt:\"" + salt + "\",ct:\"" + ct + "\"}";
      return result as any as sjcl.SjclCipherEncrypted;
    }

    private crypt2sekrit = (c) => {
      const commaSeparated = c
          .replace(/^{iv:\"/, '')
          .replace(/",salt:"/, ',')
          .replace(/",ct:"/, ',')
          .replace(/\"}$/, '');
      return this.toWebsafe(commaSeparated);
    }

    public encrypt(plaintext) {
      return this.crypt2sekrit(sjcl.encrypt(this.password, plaintext));
    }

    public decrypt(ciphertext) {
      require(() => ciphertext);
      require(() => ciphertext.length >= 46);
      return sjcl.decrypt(this.password, this.sekrit2crypt(ciphertext));
    }

  }

  let assert, require;
  if (window.location.href.slice(0, 5) === 'file:') {
    console.log('Test Environment. Assertions enabled');
    assert = (predicate) => {
      if (!predicate()) {
        throw "Assertion failed. " + predicate;
      }
    };
    require = (predicate) => {
      if (!predicate()) {
        throw "Precondition failed. " + predicate;
      }
    };
  } else {
    assert = (predicate) => {};
    require = (predicate) => {};
  }

  const CIRKLE_CIPHER = new Cipher('O', '', 'supersekrit');

  $(() => {
    $(window).on('hashchange', main);
    main();
    $('#create').click(() => {
      try {
        const friendly = $('#friendly').val().trim() || '(anonymous)';
        const cirkleString = createCirkle(friendly);
        return window.location.hash = '#' + cirkleString;
      } catch (e) {
        return alert(e);
      }
    });
    return $('textarea[readonly]').mouseenter(() => $(this).select());
  });

  const main = () => {
    const $content = $('#content');
    const cirkleString = fromHash();
    return (!cirkleString || cirkleString.length === 0)
        ? dontHaveCirkle($content)
        : haveCirkle($content, cirkleString);
  };

  const dontHaveCirkle = ($content) => {
    $('#no-circkle').slideDown();
    $('#bad-circkle').slideUp();
    return $('#have-circkle').slideUp();
  };

  const haveCirkle = ($content, cirkleString) => {
    $('.cirkle-name').text(cirkleString);
    let prefix, friendly;
    try {
      const ref = (CIRKLE_CIPHER.decrypt(cirkleString)).split('|')
      prefix = ref[0]
      friendly = ref[1];
    } catch (e) {
      prefix = e;
      friendly = "ERROR decrypting";
    }
    $('#no-circkle').slideUp();
    if (prefix !== CIRKLE_PREFIX) {
      $('#bad-circkle').slideDown();
      return $('#have-circkle').slideUp();
    }
    $('title').text("Sekrit Cirkle: " + friendly);
    $('.friendly-name').text(friendly);
    $('#cirkle-link').val(
      "Go to this web page to receive messages from the Sekrit Cirkle: " +
          friendly + "\n" + window.location.href);
    $('#bad-circkle').slideUp();
    $('#have-circkle').slideDown();
    const cirkle = new Cipher('Shh:', '!', cirkleString);
    const $msgIn = $('#msg-in');
    $msgIn.keyup(() => {
      return afterTick(() => {
        $('#sekrit-out').text(cirkle.encrypt($msgIn.val().trim()));
        return $('#secret-out-wrapper').slideDown();
      });
    });
    const $sekritIn = $('#sekrit-in');
    return $sekritIn.on('paste', () => {
      return afterTick(() => {
        const sekrit = $sekritIn.val().trim();
        try {
          $('#msg-out').text(cirkle.decrypt(sekrit));
          $('#msg-out-wrapper').slideDown();
        } catch (e) {
          // TODO(eob) fix this hack
          if (e.message !== "ccm: tag doesn't match") {
            alert(e);
          }
        }
      });
    });
  };

  const fromHash = () => window.location.hash.substring(1);

  const createCirkle = (friendly) => CIRKLE_CIPHER.encrypt(CIRKLE_PREFIX + "|" + friendly);

  const afterTick = (func) => setTimeout(func, 0);

}).call(this);