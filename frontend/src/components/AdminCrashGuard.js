import React from 'react';

class AdminCrashGuard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      info: null,
    };
  }

  componentDidCatch(error, info) {
    this.setState({ error, info });
  }

  componentDidMount() {}

  componentWillUnmount() {}

  render() {
    const { error, info } = this.state;

    if (error) {
      return (
        <div className="admin-crash-guard">
          <div className="admin-crash-card">
            <h2>Admin page crashed</h2>
            <p>The page hit a runtime error instead of loading normally.</p>
            <pre>{error.message || String(error)}</pre>
            {info?.componentStack ? <pre>{info.componentStack}</pre> : null}
            <button className="btn btn-primary" onClick={() => window.location.assign('/admin')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AdminCrashGuard;