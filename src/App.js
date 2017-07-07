import React, { Component } from 'react';
import styled from 'styled-components';
import 'normalize.css';
import SplitPane from 'react-split-pane';

import { background, border, font } from './styling/variables';
import Header from './components/Header';
import Editor from './components/Editor';
import UASTViewer from './components/UASTViewer';
import { Notifications, Error } from './components/Notifications';
import { indexDrivers } from './drivers';
import * as api from './services/api';

import { codePy } from './examples/example.py.js';
import codePyUast from './examples/example.py.uast.json';
import { codeJava } from './examples/example.java.js';
import codeJavaUast from './examples/example.java.uast.json';

const examples = {
  python: {
    code: codePy,
    uast: codePyUast
  },
  java: {
    code: codeJava,
    uast: codeJavaUast
  }
};

const Wrap = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  display: flex;
  flex-direction: column;
`;

const Content = styled.div`
  display: flex;
  height: 100%;
  flex-direction: row;
  position: relative;
`;

function getInitialState(lang) {
  return {
    languages: {
      auto: { name: '(auto)' }
    },
    // babelfish tells us which language is active at the moment, but it
    // won't be used unless the selectedLanguage is auto.
    actualLanguage: lang,
    loading: false,
    // this is the language that is selected by the user. It overrides the
    // actualLanguage except when it is 'auto'.
    selectedLanguage: 'auto',
    selectedExample: lang,
    code: examples[lang].code,
    ast: examples[lang].uast,
    dirty: false,
    errors: []
  };
}

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = Object.assign({}, getInitialState('python'));
    this.mark = null;
  }

  componentDidMount() {
    this.setState({ loading: true });

    this.loaded = api
      .listDrivers()
      .then(indexDrivers)
      .then(languages =>
        this.setState({
          languages: Object.assign(this.state.languages, languages)
        })
      )
      .catch(err => {
        console.error(err);
        this.setState({
          loading: false,
          errors: ['Unable to load the list of available drivers.']
        });
      });
  }

  componentDidUpdate() {
    this.refs.editor.setMode(this.languageMode);
    this.refs.editor.updateCode();
  }

  onLanguageChanged(language) {
    let selectedLanguage = language;
    if (!this.hasLanguage(selectedLanguage)) {
      selectedLanguage = 'auto';
    }
    this.setState({ selectedLanguage });
  }

  onExampleChanged(lang) {
    this.setState(getInitialState(lang));
  }

  hasLanguage(lang) {
    return this.state.languages.hasOwnProperty(lang);
  }

  onRunParser() {
    this.setState({ loading: true, errors: [] });
    api
      .parse(this.currentLanguage, this.state.code)
      .then(ast => this.setState({ loading: false, ast }))
      .catch(errors => this.setState({ loading: false, errors }));
  }

  onErrorRemoved(idx) {
    this.setState({
      errors: this.state.errors.filter((_, i) => i !== idx)
    });
  }

  onNodeSelected(from, to) {
    if (this.mark) {
      this.mark.clear();
    }

    this.mark = this.refs.editor.selectCode(from, to);
  }

  clearNodeSelection() {
    if (this.mark) {
      this.mark.clear();
      this.mark = null;
    }
  }

  onCursorChanged(pos) {
    if (!this.refs.viewer || !this.state.ast) {
      return;
    }

    this.refs.viewer.selectNode(pos);
  }

  onCodeChange(code) {
    this.setState({ code, dirty: true });
  }

  get currentLanguage() {
    let { selectedLanguage, actualLanguage } = this.state;

    if (selectedLanguage === 'auto') {
      selectedLanguage = actualLanguage;
    }

    return selectedLanguage;
  }

  get languageMode() {
    if (this.state.languages[this.currentLanguage]) {
      return this.state.languages[this.currentLanguage].mode;
    }

    return '';
  }

  render() {
    const { innerWidth: width } = window;
    const {
      languages,
      selectedLanguage,
      code,
      ast,
      loading,
      actualLanguage,
      dirty,
      errors
    } = this.state;

    return (
      <Wrap>
        <Header
          languages={languages}
          selectedLanguage={selectedLanguage}
          actualLanguage={actualLanguage}
          onLanguageChanged={e => this.onLanguageChanged(e.target.value)}
          onExampleChanged={e => this.onExampleChanged(e.target.value)}
          onRunParser={e => this.onRunParser(e)}
          dirty={dirty}
          examples={examples}
          loading={loading}
        />
        <Content>
          <SplitPane
            split="vertical"
            minSize={width * 0.25}
            defaultSize="50%"
            maxSize={width * 0.75}
          >
            <Editor
              ref="editor"
              code={code}
              languageMode={this.languageMode}
              onChange={code => this.onCodeChange(code)}
              onCursorChanged={pos => this.onCursorChanged(pos)}
            />

            <UASTViewer
              ref="viewer"
              clearNodeSelection={() => this.clearNodeSelection()}
              onNodeSelected={(from, to) => this.onNodeSelected(from, to)}
              ast={ast}
              loading={loading}
            />
          </SplitPane>
        </Content>

        <Footer />

        {errors.length > 0
          ? <Notifications>
              {errors.map((err, i) => {
                return (
                  <Error
                    message={err}
                    key={i}
                    onRemove={() => this.onErrorRemoved(i)}
                  />
                );
              })}
            </Notifications>
          : null}
      </Wrap>
    );
  }
}

const FooterContainer = styled.footer`
  padding: .5rem;
  font-size: .9rem;
  text-align: center;
  border-top: 1px solid ${border.smooth};
  background: ${background.light};
`;

const Link = styled.a`color: ${font.color.dark};`;

function Footer() {
  return (
    <FooterContainer>
      Built with{' '}
      <Link href="https://github.com/bblfsh/documentation" target="_blank">
        Babelfish
      </Link>{' '}
      (see{' '}
      <Link href="https://doc.bblf.sh" target="_blank">
        documentation
      </Link>),{' '}
      <Link href="http://codemirror.net/" target="_blank">
        CodeMirror
      </Link>, and{' '}
      <Link href="https://facebook.github.io/react" target="_blank">
        React
      </Link>{' '}
      under GPLv3 license. Fork{' '}
      <Link
        href="https://github.com/bblfsh/dashboard/#fork-destination-box"
        target="_blank"
      >
        this demo
      </Link>. Coded by{' '}
      <Link href="https://sourced.tech" target="_blank">
        {'source{d}'}
      </Link>.
    </FooterContainer>
  );
}
