const should = require('should')
const wdFilter = require('../lib/wikidata_filter')
const { getEntity } = require('./utils')
const entity = getEntity()

describe('attributes', () => {
  describe('validation', () => {
    it('should reject an invalid attribute', done => {
      should(() => wdFilter({ keep: ['bulgroz'] })).throw()
      done()
    })
  })

  describe('keep', () => {
    it('should keep specified attributes, omit the others', done => {
      const options = { keep: ['id'] }
      const result = wdFilter(options)(entity)
      result.id.should.be.ok()
      should(result.type).not.be.ok()
      should(result.aliases).not.be.ok()
      should(result.labels).not.be.ok()
      should(result.descriptions).not.be.ok()
      should(result.sitelinks).not.be.ok()
      done()
    })
  })

  describe('omit', () => {
    it('should omit specified attributes, keep the others', done => {
      const options = { omit: ['sitelinks'] }
      const result = wdFilter(options)(entity)
      result.id.should.be.ok()
      result.type.should.be.ok()
      result.aliases.should.be.ok()
      result.labels.should.be.ok()
      result.descriptions.should.be.ok()
      should(result.sitelinks).not.be.ok()
      done()
    })
  })
})
