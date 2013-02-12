CIRKLE_PREFIX   = 'supersekrit'

#BEGIN Cipher class
Cipher = ( (password) ->

  toWebsafe = (s) ->
    s.replace( /\+/g, '-' )
     .replace( /\//g, '_' )

  fromWebsafe = (s) ->
    s.replace( /\-/g, '+' )
     .replace( /_/g , '/' )

  sekrit2crypt = (s) ->
    [iv, salt, ct] = fromWebsafe(s).split ','
    assert ->   iv.length == 22
    assert -> salt.length == 11
    assert ->   ct.length >= 11
    "{iv:\"#{iv}\",salt:\"#{salt}\",ct:\"#{ct}\"}"

  crypt2sekrit = (c) ->
    toWebsafe c.replace( /^{iv:\"/ , ''  )
               .replace( '",salt:"', ',' )
               .replace( '",ct:"'  , ',' )
               .replace( /\"}$/    , ''  )

  @encrypt = (plaintext) ->
    crypt2sekrit sjcl.encrypt password, plaintext

  @decrypt = (ciphertext) ->
    require -> ciphertext
    require -> ciphertext.length >= 46
    sjcl.decrypt password, sekrit2crypt ciphertext

  null
)
#END Cipher class

if window.location.href.slice(0,5) == 'file:'
  console.log 'Test Environment. Assertions enabled'

  assert = (predicate) ->
    if !predicate()
      throw "Assertion failed. #{predicate}"

  require = (predicate) ->
    if !predicate()
      throw "Precondition failed. #{predicate}"

else
  #Production Environment, Assertions disabled

  assert  = (predicate) ->
  require = (predicate) ->


CIRKLE_CIPHER = new Cipher 'supersekrit'

$ ->
  $(window).on 'hashchange', main
  main()

  $('#create').click ->
    try
      friendly = $('#friendly').val().trim() || '(anonymous)'
      window.location.hash = '#' + (createCirkle friendly)
    catch e
      alert e

main = ->
  $content = $ '#content'

  cirkleString = fromHash()

  if !cirkleString || cirkleString.length==0
    dontHaveCirkle $content
  else
    haveCirkle $content, cirkleString

dontHaveCirkle = ($content) ->
  $('#no-circkle').slideDown()
  $('#bad-circkle').slideUp()
  $('#have-circkle').slideUp()


haveCirkle = ($content, cirkleString) ->

  $('.cirkle-name').text cirkleString
  try
    [prefix,friendly] = (CIRKLE_CIPHER.decrypt cirkleString).split '|'
  catch e
    prefix = e
  $('#no-circkle').slideUp()
  if prefix != CIRKLE_PREFIX
    $('#bad-circkle').slideDown()
    $('#have-circkle').slideUp()
  else
    $('title').text "Sekrit Cirkle: #{friendly}"
    $('.friendly-name').text friendly
    $('#cirkle-link').val """Go to this web page to receive messages from the Sekrit Cirkle: #{friendly}
#{window.location.href}"""
    $('#bad-circkle').slideUp()
    $('#have-circkle').slideDown()
    cirkle = new Cipher cirkleString
    $msgIn = $ '#msg-in'
    $msgIn.keypress ->
      afterTick ->
        $('#sekrit-out').text cirkle.encrypt $msgIn.val().trim()
        $('#secret-out-wrapper').slideDown()
    $sekritIn = $ '#sekrit-in'
    $sekritIn.on 'paste', ->
      afterTick ->
        $('#msg-out').text cirkle.decrypt $sekritIn.val().trim()
        $('#msg-out-wrapper').slideDown()



#get string following hash
fromHash =  ->
  window.location.hash.substring 1


createCirkle = (friendly) ->
  CIRKLE_CIPHER.encrypt "#{CIRKLE_PREFIX}|#{friendly}"


afterTick = (func) ->  setTimeout func, 0
